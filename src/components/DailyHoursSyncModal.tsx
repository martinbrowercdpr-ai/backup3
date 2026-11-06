import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  ClipboardPaste,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  FileCheck,
  Truck,
  Snowflake,
  Container,
  Gauge,
  Clock,
  Filter,
} from 'lucide-react';
import { Vehicle } from '../types';
import { TRUCK_TO_TK_MAPPING, TK_TO_TRUCK_MAPPING } from '../data/initialData';
import { isCarreta50k } from '../utils/maintenanceCalculations';
import { parseRawMeter, validateAndSanitizeMeter, getTkLastPreventivaMeter } from '../utils/meterValidation';
import * as XLSX from 'xlsx';

interface SyncItemPreview {
  plate: string;
  foundVehicle?: Vehicle;
  targetType?: 'cavalo' | 'tk' | 'carreta';
  previousMeter: number;
  newMeter: number;
  diff: number;
  unit: 'KM' | 'HORAS';
  sourceColumn?: string;
  isIncrementApplied?: boolean;
  status:
    | 'valid'
    | 'no_change'
    | 'not_found'
    | 'invalid_number'
    | 'suspicious_low'
    | 'excessive_period'
    | 'blocked_format';
  validationMessage?: string;
  isDecimalTruncationFixed?: boolean;
  rawRow: any;
  rowCount?: number;
  detectedReadings?: number[];
  isHighestSelected?: boolean;
}

interface DailyHoursSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onBatchUpdateMeters: (
    updates: {
      plate: string;
      vehicleId?: string;
      vehicleType?: 'cavalo' | 'tk' | 'carreta';
      newMeter: number;
      note?: string;
    }[]
  ) => void;
}

const STORAGE_KEY_GSHEET_URL = 'fleet_daily_sync_gsheet_url_v1';
const STORAGE_KEY_LAST_SYNC = 'fleet_daily_sync_last_time_v1';

export const DailyHoursSyncModal: React.FC<DailyHoursSyncModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onBatchUpdateMeters,
}) => {
  const [activeTab, setActiveTab] = useState<'gsheet' | 'file' | 'paste'>('gsheet');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_GSHEET_URL) || '';
  });
  const [pasteText, setPasteText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewList, setPreviewList] = useState<SyncItemPreview[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  });
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState<boolean>(true);
  // Modo de Entrada: 'odometer' (Odômetro/Horímetro Total) ou 'daily_increment' (Rodagem / Horas do Dia)
  const [inputMode, setInputMode] = useState<'odometer' | 'daily_increment'>('odometer');
  // Sincronizar também KM das Carretas a partir da planilha
  const [syncCarretaKm, setSyncCarretaKm] = useState<boolean>(true);
  // Filtro de Categoria ativa na pré-visualização: Todos, Cavalos, Carretas ou TKs
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'cavalo' | 'carreta' | 'tk'>('all');
  // Armazena as linhas brutas para recalcular se o usuário alternar o inputMode ou syncCarretaKm
  const [cachedRawRows, setCachedRawRows] = useState<any[]>([]);

  if (!isOpen) return null;

  // Função auxiliar para normalizar placa (remove hífen, espaços e transforma em maiúsculo)
  const cleanPlate = (str: string) => (str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Helper com validação rigorosa para converter strings ou números com pontos/vírgulas em número inteiro válido
  const parseNumericValue = (raw: any, vehicleType?: any, currentMeter?: number): number => {
    const res = parseRawMeter(raw, vehicleType, currentMeter);
    return res.numericValue;
  };

  // Processa dados tabulares brutos (linhas com colunas)
  const parseRowsToPreview = (
    rows: any[],
    modeOverride?: 'odometer' | 'daily_increment',
    syncCarretasOverride?: boolean
  ): SyncItemPreview[] => {
    if (!rows || rows.length === 0) {
      setErrorMessage('Nenhum dado encontrado no arquivo ou link fornecido.');
      return [];
    }

    const currentMode = modeOverride || inputMode;
    const shouldSyncCarretas = syncCarretasOverride !== undefined ? syncCarretasOverride : syncCarretaKm;

    // 1. Identificação inteligente das colunas da planilha
    const firstRow = rows[0] || {};
    const keys = Object.keys(firstRow);

    const normalizeKey = (k: string) =>
      (k || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Coluna específica de CAVALO
    const cavaloKey = keys.find((k) => {
      const n = normalizeKey(k);
      return (
        n === 'cavalo' ||
        n === 'cvm' ||
        n === 'placa cavalo' ||
        n === 'placa cvm' ||
        n === 'cavalo mecanico' ||
        n === 'trator' ||
        n === 'caminhao' ||
        n === 'placa caminhao' ||
        (n.startsWith('cavalo') && !n.includes('tk'))
      );
    });

    // Coluna específica de PLACA TK (Refrigeração / Thermo King)
    const tkKey = keys.find((k) => {
      const n = normalizeKey(k);
      return (
        n === 'placa tk' ||
        n === 'tk' ||
        n === 'placa do tk' ||
        n === 'tk placa' ||
        n === 'placa_tk' ||
        n === 'placat k' ||
        n === 'equipamento tk' ||
        n === 'aparelho tk' ||
        n === 'thermo king' ||
        n === 'termo king' ||
        n === 'placa thermo king' ||
        n === 'placa termo king' ||
        n === 'refrigeracao' ||
        n === 'placa refrigeracao' ||
        n === 'carreta / tk' ||
        n === 'carreta/tk' ||
        n === 'placa carreta / tk' ||
        n === 'placa carreta/tk' ||
        n === 'carreta_tk' ||
        (n.includes('tk') && (n.includes('placa') || n.includes('equip') || n.includes('aparelho') || n.includes('unidade')))
      );
    });

    // Coluna específica de CARRETA
    const carretaKey = keys.find((k) => {
      const n = normalizeKey(k);
      if (k === tkKey) return false;
      return (
        n === 'carreta' ||
        n === 'placa carreta' ||
        n === 'placa da carreta' ||
        n === 'carreta placa' ||
        n === 'placa_carreta' ||
        n === 'semirreboque' ||
        n === 'semi-reboque' ||
        n === 'semi reboque' ||
        n === 'reboque' ||
        n === 'placa semirreboque' ||
        n === 'placa reboque' ||
        (n.startsWith('carreta') && !n.includes('tk'))
      );
    });

    // Colunas de Hodômetro (KM do Cavalo / Cavalo Mecânico / Carreta)
    const isHodoCol = (k: string) => {
      const n = normalizeKey(k);
      if (
        n === 'horas_ou_km' ||
        n === 'horas/km' ||
        n === 'horas_km' ||
        n === 'valor' ||
        n === 'leitura' ||
        n === 'medicao' ||
        n === 'km' ||
        n === 'kms' ||
        n === 'km carreta' ||
        n === 'hodometro carreta'
      ) {
        return true;
      }
      const hasHodo = n.includes('hodo') || n.includes('odomet') || n.includes('km') || n.includes('quilometr');
      const hasHori = (n.includes('horim') || n.includes('hori') || n.includes('hora') || n.includes('diesel') || n.includes('frio')) && !n.includes('km');
      return hasHodo && !hasHori;
    };

    const hodometroFinalCols = keys.filter((k) => {
      const n = normalizeKey(k);
      if (!isHodoCol(k)) return false;
      return (
        n.includes('final') ||
        n.includes('fim') ||
        n.includes('retorno') ||
        n.includes('atual') ||
        n.includes('chegada') ||
        n.includes('leitura') ||
        n.includes('nova') ||
        n.includes('novo') ||
        n.includes('termino') ||
        n.includes('descarga') ||
        n.includes('tot') ||
        n === 'hodometro' ||
        n === 'odometro' ||
        n === 'km' ||
        n === 'kms' ||
        n === 'valor' ||
        n === 'horas_ou_km' ||
        n === 'horas/km' ||
        n === 'horas_km' ||
        n === 'km final' ||
        n === 'kms final' ||
        n === 'kms hodometro final' ||
        n === 'km hodometro final' ||
        n === 'hodometro final' ||
        n === 'hodometro_final' ||
        n === 'km_final' ||
        n === 'km carreta' ||
        n === 'hodometro carreta'
      );
    });

    const hodometroInitialCols = keys.filter((k) => {
      const n = normalizeKey(k);
      return (
        isHodoCol(k) &&
        (n.includes('inicial') || n.includes('ini') || n.includes('partida') || n.includes('saida') || n.includes('inicio'))
      );
    });

    const hodometroGeneralCols = keys.filter((k) => {
      return isHodoCol(k) && !hodometroFinalCols.includes(k) && !hodometroInitialCols.includes(k);
    });

    // Colunas de Hodômetro específico de Carreta
    const isCarretaHodoCol = (k: string) => {
      const n = normalizeKey(k);
      return (
        n === 'km carreta' ||
        n === 'hodometro carreta' ||
        n === 'odometro carreta' ||
        n === 'km_carreta' ||
        n === 'hodometro_carreta' ||
        n === 'horas_ou_km' ||
        n === 'horas/km' ||
        n === 'valor' ||
        n === 'leitura' ||
        n === 'km' ||
        n === 'kms' ||
        ((n.includes('carreta') || n.includes('reboque')) &&
          (n.includes('km') || n.includes('hodo') || n.includes('odomet') || n.includes('leitura') || n.includes('final') || n.includes('retorno') || n.includes('novo') || n.includes('nova')))
      );
    };

    const carretaHodoFinalCols = keys.filter((k) => isCarretaHodoCol(k));

    // Colunas de Horímetro (Horas do TK / Thermo King)
    const isHoriCol = (k: string) => {
      const n = normalizeKey(k);
      const hasHori =
        n.includes('horim') ||
        n.includes('hori') ||
        n.includes('hora') ||
        n.includes('hr') ||
        n.includes('frio') ||
        n.includes('diesel') ||
        n.includes('termo') ||
        n.includes('thermo') ||
        (n.includes('tk') && !n.includes('placa') && !n.includes('carreta'));
      const hasHodo = n.includes('hodo') || n.includes('odomet') || (n.includes('km') && !n.includes('tk'));
      return hasHori && !hasHodo;
    };

    const horimetroFinalCols = keys.filter((k) => {
      const n = normalizeKey(k);
      if (!isHoriCol(k)) return false;
      return (
        n.includes('final') ||
        n.includes('fim') ||
        n.includes('retorno') ||
        n.includes('atual') ||
        n.includes('chegada') ||
        n.includes('leitura') ||
        n.includes('nova') ||
        n.includes('termino') ||
        n.includes('descarga') ||
        n.includes('tot') ||
        n.includes('diesel') ||
        n === 'horimetro' ||
        n === 'horimetro tk' ||
        n === 'horimetro_tk' ||
        n === 'horas' ||
        n === 'horas tk' ||
        n === 'horas_tk' ||
        n === 'hr' ||
        n === 'hr tk' ||
        n === 'horimetro final' ||
        n === 'horimetro final tk' ||
        n === 'horimetro tk final' ||
        n === 'horimetro_final' ||
        n === 'horas final' ||
        n === 'horas tk final'
      );
    });

    const horimetroInitialCols = keys.filter((k) => {
      const n = normalizeKey(k);
      if (!isHoriCol(k)) return false;
      return (
        n.includes('inicial') ||
        n.includes('ini') ||
        n.includes('partida') ||
        n.includes('saida') ||
        n.includes('inicio')
      );
    });

    const horimetroGeneralCols = keys.filter((k) => {
      return isHoriCol(k) && !horimetroFinalCols.includes(k) && !horimetroInitialCols.includes(k);
    });

    // Coluna genérica de Placa (caso a planilha não use colunas separadas Cavalo/Carreta/TK)
    const genericPlateKey =
      keys.find((k) => {
        const lower = normalizeKey(k);
        return lower.includes('placa') || lower === 'veiculo' || lower === 'unidade' || lower === 'frota';
      }) || keys[0];

    // Helper para extrair o melhor valor numérico de um grupo de colunas com prevalência do FINAL
    const extractBestFromRow = (
      row: any,
      finals: string[],
      initials: string[],
      generals: string[]
    ): { key: string; val: number; isFinal: boolean } | null => {
      const finalCandidates: { key: string; val: number; isFinal: boolean }[] = [];
      const generalCandidates: { key: string; val: number; isFinal: boolean }[] = [];
      const initialCandidates: { key: string; val: number; isFinal: boolean }[] = [];

      finals.forEach((k) => {
        const val = parseNumericValue(row[k]);
        if (!isNaN(val) && val >= 0) finalCandidates.push({ key: k, val, isFinal: true });
      });

      generals.forEach((k) => {
        const val = parseNumericValue(row[k]);
        if (!isNaN(val) && val >= 0) generalCandidates.push({ key: k, val, isFinal: false });
      });

      initials.forEach((k) => {
        const val = parseNumericValue(row[k]);
        if (!isNaN(val) && val >= 0) initialCandidates.push({ key: k, val, isFinal: false });
      });

      // Se há medição FINAL (HORIMETRO FINAL / HODOMETRO FINAL), ela TEM PRIORIDADE ABSOLUTA!
      if (finalCandidates.length > 0) {
        finalCandidates.sort((a, b) => b.val - a.val);
        return finalCandidates[0];
      }

      if (generalCandidates.length > 0) {
        generalCandidates.sort((a, b) => b.val - a.val);
        return generalCandidates[0];
      }

      if (initialCandidates.length > 0) {
        initialCandidates.sort((a, b) => b.val - a.val);
        return initialCandidates[0];
      }

      return null;
    };

    // Helper mestre para localizar o veículo TK de acordo com a placa ou vínculos operacionais
    const findTkVehicle = (
      rawTk?: string,
      rawCavalo?: string,
      rawCarreta?: string
    ): Vehicle | undefined => {
      // 1. Tenta identificar a partir de rawTk (se fornecido na coluna PLACA TK)
      if (rawTk) {
        const cleanTk = cleanPlate(rawTk);
        if (cleanTk) {
          // Busca direta em veículos do tipo 'tk'
          const direct = vehicles.find((v) => v.type === 'tk' && cleanPlate(v.plate) === cleanTk);
          if (direct) return direct;

          // Com formato hífen (ex: EQF4590 -> EQF-4590)
          if (cleanTk.length === 7) {
            const withHyphen = `${cleanTk.slice(0, 3)}-${cleanTk.slice(3)}`;
            const directHyphen = vehicles.find((v) => v.type === 'tk' && cleanPlate(v.plate) === cleanPlate(withHyphen));
            if (directHyphen) return directHyphen;
          }

          // Mapeamento caminhão -> TK (ex: DUE-4590 -> EQF-4590, TCK-6F97 -> EQF-9424)
          const mapped = TRUCK_TO_TK_MAPPING[rawTk.trim()] || TRUCK_TO_TK_MAPPING[cleanTk];
          if (mapped) {
            const directMapped = vehicles.find((v) => v.type === 'tk' && cleanPlate(v.plate) === cleanPlate(mapped));
            if (directMapped) return directMapped;
          }

          // Busca por fleetNumber
          const byFleet = vehicles.find(
            (v) => v.type === 'tk' && (cleanPlate(v.fleetNumber || '') === cleanTk || v.fleetNumber === rawTk.trim())
          );
          if (byFleet) return byFleet;

          // Se a placa informada for de um cavalo que possui coupledTkPlate
          const cavaloMatch = vehicles.find((v) => v.type === 'cavalo' && cleanPlate(v.plate) === cleanTk);
          if (cavaloMatch?.coupledTkPlate) {
            const coupled = vehicles.find(
              (v) => v.type === 'tk' && cleanPlate(v.plate) === cleanPlate(cavaloMatch.coupledTkPlate!)
            );
            if (coupled) return coupled;
          }

          // Se a placa informada for de uma carreta que possui coupledTkPlate
          const carretaMatch = vehicles.find((v) => v.type === 'carreta' && cleanPlate(v.plate) === cleanTk);
          if (carretaMatch?.coupledTkPlate) {
            const coupled = vehicles.find(
              (v) => v.type === 'tk' && cleanPlate(v.plate) === cleanPlate(carretaMatch.coupledTkPlate!)
            );
            if (coupled) return coupled;
          }
        }
      }

      // 2. Tenta a partir de rawCavalo (quando a linha tem Cavalo e HORIMETRO FINAL)
      if (rawCavalo) {
        const cleanCav = cleanPlate(rawCavalo);
        if (cleanCav) {
          const cavObj = vehicles.find((v) => v.type === 'cavalo' && cleanPlate(v.plate) === cleanCav);
          if (cavObj) {
            if (cavObj.coupledTkPlate) {
              const tk = vehicles.find(
                (v) => v.type === 'tk' && cleanPlate(v.plate) === cleanPlate(cavObj.coupledTkPlate!)
              );
              if (tk) return tk;
            }
            const mapped = TRUCK_TO_TK_MAPPING[cavObj.plate] || TRUCK_TO_TK_MAPPING[cleanCav];
            if (mapped) {
              const tk = vehicles.find((v) => v.type === 'tk' && cleanPlate(v.plate) === cleanPlate(mapped));
              if (tk) return tk;
            }
          }
        }
      }

      // 3. Tenta a partir de rawCarreta
      if (rawCarreta) {
        const cleanCar = cleanPlate(rawCarreta);
        if (cleanCar) {
          // Muitas TKs têm a mesma placa da carreta
          const tkDirect = vehicles.find((v) => v.type === 'tk' && cleanPlate(v.plate) === cleanCar);
          if (tkDirect) return tkDirect;

          const carObj = vehicles.find((v) => v.type === 'carreta' && cleanPlate(v.plate) === cleanCar);
          if (carObj?.coupledTkPlate) {
            const tk = vehicles.find(
              (v) => v.type === 'tk' && cleanPlate(v.plate) === cleanPlate(carObj.coupledTkPlate!)
            );
            if (tk) return tk;
          }
        }
      }

      return undefined;
    };

    // Estrutura para agrupar leituras por veículo / placa
    interface PlateCandidateGroup {
      rawPlate: string;
      matched?: Vehicle;
      targetType: 'cavalo' | 'tk' | 'carreta';
      unit: 'KM' | 'HORAS';
      records: {
        row: any;
        val: number;
        sourceCol: string;
        isFinalCol: boolean;
      }[];
    }

    const groupedMap = new Map<string, PlateCandidateGroup>();

    rows.forEach((row) => {
      // Puxa as melhores leituras da linha atual (com prioridade absoluta para FINAL)
      const bestHori = extractBestFromRow(
        row,
        horimetroFinalCols,
        horimetroInitialCols,
        horimetroGeneralCols
      );
      const bestHodo = extractBestFromRow(
        row,
        hodometroFinalCols,
        hodometroInitialCols,
        hodometroGeneralCols
      );
      const bestCarretaHodo = extractBestFromRow(
        row,
        carretaHodoFinalCols,
        [],
        []
      );

      let rawTk = tkKey && row[tkKey] ? String(row[tkKey]).trim() : '';
      let rawCavalo = cavaloKey && row[cavaloKey] ? String(row[cavaloKey]).trim() : '';
      let rawCarreta = carretaKey && row[carretaKey] ? String(row[carretaKey]).trim() : '';

      // Se não encontrou coluna explícita de Cavalo ou TK, procura em genericPlateKey ou varre as colunas da linha
      if (!rawCavalo && !rawTk) {
        let candidatePlate = genericPlateKey && row[genericPlateKey] ? String(row[genericPlateKey]).trim() : '';
        if (!candidatePlate) {
          for (const k of keys) {
            const vStr = String(row[k] || '').trim();
            const c = cleanPlate(vStr);
            if (c.length === 7) {
              candidatePlate = vStr;
              break;
            }
          }
        }

        if (candidatePlate) {
          const cleanCand = cleanPlate(candidatePlate);
          const matchedCav = vehicles.find((v) => v.type === 'cavalo' && cleanPlate(v.plate) === cleanCand);
          const matchedTkDirect = vehicles.find((v) => v.type === 'tk' && cleanPlate(v.plate) === cleanCand);
          const matchedCar = vehicles.find((v) => v.type === 'carreta' && cleanPlate(v.plate) === cleanCand);

          if (matchedCav) {
            rawCavalo = candidatePlate;
            if (bestHori && matchedCav.coupledTkPlate) {
              rawTk = matchedCav.coupledTkPlate;
            } else if (bestHori && TRUCK_TO_TK_MAPPING[matchedCav.plate]) {
              rawTk = TRUCK_TO_TK_MAPPING[matchedCav.plate];
            }
          } else if (matchedCar && shouldSyncCarretas) {
            rawCarreta = candidatePlate;
            if (bestHori && matchedCar.coupledTkPlate) {
              rawTk = matchedCar.coupledTkPlate;
            }
          } else if (matchedTkDirect && !shouldSyncCarretas) {
            rawTk = candidatePlate;
            if (bestHodo && TK_TO_TRUCK_MAPPING[matchedTkDirect.plate]) {
              rawCavalo = TK_TO_TRUCK_MAPPING[matchedTkDirect.plate];
            }
          } else if (matchedCar) {
            rawCarreta = candidatePlate;
            if (bestHori && matchedCar.coupledTkPlate) {
              rawTk = matchedCar.coupledTkPlate;
            }
          } else if (matchedTkDirect) {
            rawTk = candidatePlate;
            if (bestHodo && TK_TO_TRUCK_MAPPING[matchedTkDirect.plate]) {
              rawCavalo = TK_TO_TRUCK_MAPPING[matchedTkDirect.plate];
            }
          } else {
            // Se não encontrou diretamente na frota
            if (bestHori && !bestHodo) {
              rawTk = candidatePlate;
            } else if (shouldSyncCarretas) {
              rawCarreta = candidatePlate;
            } else {
              rawCavalo = candidatePlate;
            }
          }
        }
      }

      // Se temos rawCavalo e bestHori, mas não temos rawTk, descobre o TK vinculado ao Cavalo
      if (rawCavalo && bestHori && !rawTk) {
        const foundCoupled = findTkVehicle('', rawCavalo, rawCarreta);
        if (foundCoupled) {
          rawTk = foundCoupled.plate;
        }
      }

      // --- 1. PROCESSA TK (HORÍMETRO FINAL DE ACORDO COM A PLACA TK) ---
      // REGRA MESTRE: Atualiza SEMPRE o Horímetro Final de acordo com a placa do TK lida na planilha
      if (bestHori && (rawTk || rawCavalo || rawCarreta)) {
        const matchedTk = findTkVehicle(rawTk, rawCavalo, rawCarreta);
        const effectiveTkPlate = matchedTk
          ? matchedTk.plate
          : rawTk || (rawCarreta && isHoriCol(carretaKey || '') ? rawCarreta : '');
        const cleanTk = cleanPlate(effectiveTkPlate);

        if (cleanTk && cleanTk.length >= 5) {
          const groupKey = matchedTk ? `tk_${cleanPlate(matchedTk.plate)}` : `tk_${cleanTk}`;
          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
              rawPlate: matchedTk ? matchedTk.plate : effectiveTkPlate,
              matched: matchedTk,
              targetType: 'tk',
              unit: 'HORAS',
              records: [],
            });
          }
          groupedMap.get(groupKey)!.records.push({
            row,
            val: bestHori.val,
            sourceCol: bestHori.key,
            isFinalCol: bestHori.isFinal,
          });
        }
      }

      // --- 2. PROCESSA CAVALO (HODÔMETRO FINAL DO CAVALO MECÂNICO DE ACORDO COM A PLACA) ---
      if (bestHodo && rawCavalo) {
        const cleanedCavalo = cleanPlate(rawCavalo);
        if (cleanedCavalo && cleanedCavalo.length >= 5) {
          const matchedCavalo =
            vehicles.find((v) => v.type === 'cavalo' && cleanPlate(v.plate) === cleanedCavalo) ||
            vehicles.find((v) => cleanPlate(v.plate) === cleanedCavalo);

          const groupKey = matchedCavalo ? `cavalo_${cleanPlate(matchedCavalo.plate)}` : `cavalo_${cleanedCavalo}`;
          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
              rawPlate: matchedCavalo ? matchedCavalo.plate : rawCavalo,
              matched: matchedCavalo,
              targetType: 'cavalo',
              unit: 'KM',
              records: [],
            });
          }
          groupedMap.get(groupKey)!.records.push({
            row,
            val: bestHodo.val,
            sourceCol: bestHodo.key,
            isFinalCol: bestHodo.isFinal,
          });
        }
      }

      // --- 3. PROCESSA CARRETA (HODÔMETRO / KM DA CARRETA - TRAVA 30K/50K) ---
      if (shouldSyncCarretas) {
        let carretaPlateCandidate = rawCarreta;
        // Se a linha tem Cavalo e Hodômetro, mas a coluna Carreta não veio preenchida,
        // verifica se o Cavalo tem Carreta acoplada registrada
        if (!carretaPlateCandidate && rawCavalo) {
          const cavObj = vehicles.find((v) => v.type === 'cavalo' && cleanPlate(v.plate) === cleanPlate(rawCavalo));
          if (cavObj?.coupledCarretaPlate) {
            carretaPlateCandidate = cavObj.coupledCarretaPlate;
          }
        }

        const effectiveCarretaHodo = bestCarretaHodo || bestHodo;

        if (carretaPlateCandidate && effectiveCarretaHodo) {
          const cleanedCarreta = cleanPlate(carretaPlateCandidate);
          if (cleanedCarreta && cleanedCarreta.length >= 5) {
            const matchedCarreta = vehicles.find((v) => v.type === 'carreta' && cleanPlate(v.plate) === cleanedCarreta);
            if (matchedCarreta) {
              const groupKey = `carreta_${cleanPlate(matchedCarreta.plate)}`;
              if (!groupedMap.has(groupKey)) {
                groupedMap.set(groupKey, {
                  rawPlate: matchedCarreta.plate,
                  matched: matchedCarreta,
                  targetType: 'carreta',
                  unit: 'KM',
                  records: [],
                });
              }
              groupedMap.get(groupKey)!.records.push({
                row,
                val: effectiveCarretaHodo.val,
                sourceCol: effectiveCarretaHodo.key,
                isFinalCol: effectiveCarretaHodo.isFinal,
              });
            } else {
              // Placa de carreta informada mas não encontrada
              const groupKey = `carreta_${cleanedCarreta}`;
              if (!groupedMap.has(groupKey)) {
                groupedMap.set(groupKey, {
                  rawPlate: carretaPlateCandidate,
                  matched: undefined,
                  targetType: 'carreta',
                  unit: 'KM',
                  records: [],
                });
              }
              groupedMap.get(groupKey)!.records.push({
                row,
                val: effectiveCarretaHodo.val,
                sourceCol: effectiveCarretaHodo.key,
                isFinalCol: effectiveCarretaHodo.isFinal,
              });
            }
          }
        }
      }
    });

    const results: SyncItemPreview[] = [];

    // Processa os grupos de placas selecionando sempre o MAIS ALTO / MAIS ATUAL
    groupedMap.forEach((group) => {
      const { rawPlate, matched, targetType, unit, records } = group;

      const validReadings = records.map((r) => r.val).filter((n) => !isNaN(n) && n >= 0);

      if (validReadings.length === 0) {
        results.push({
          plate: matched ? matched.plate : rawPlate,
          foundVehicle: matched,
          targetType,
          previousMeter: matched ? matched.currentMeter : 0,
          newMeter: 0,
          diff: 0,
          unit: matched ? matched.meterUnit : unit,
          sourceColumn: records[0]?.sourceCol || 'Sem medição válida',
          status: 'invalid_number',
          rawRow: records[0]?.row,
          rowCount: records.length,
        });
        return;
      }

      if (!matched) {
        const maxVal = Math.max(...validReadings);
        results.push({
          plate: rawPlate,
          foundVehicle: undefined,
          targetType,
          previousMeter: 0,
          newMeter: maxVal,
          diff: 0,
          unit,
          sourceColumn: records.length > 1 ? `Maior de ${records.length} linhas` : records[0]?.sourceCol,
          status: 'not_found',
          rawRow: records[0]?.row,
          rowCount: records.length,
          detectedReadings: validReadings,
        });
        return;
      }

      // VEÍCULO ENCONTRADO NA FROTA:
      let calculatedNewMeter = 0;
      let isIncrement = false;
      let isSuspiciousLow = false;
      let isHighestSelected = false;
      let sourceDescription = '';

      if (currentMode === 'daily_increment') {
        const totalIncrement = validReadings.reduce((sum, v) => sum + v, 0);
        calculatedNewMeter = matched.currentMeter + totalIncrement;
        isIncrement = true;
        sourceDescription =
          records.length > 1
            ? `Soma de ${records.length} viagens diárias (+${totalIncrement.toLocaleString('pt-BR')} ${matched.meterUnit})`
            : `Coluna ${records[0].sourceCol}`;
      } else {
        // MODO ODÔMETRO / HORÍMETRO TOTAL:
        // INTELIGÊNCIA PRINCIPAL: SELECIONA O MAIOR VALOR FINAL (MAIS ATUAL / MAIS ALTO)
        const finalCandidates = records.filter((r) => r.isFinalCol).map((r) => r.val).filter((n) => !isNaN(n) && n >= 0);
        const highestReading = finalCandidates.length > 0 ? Math.max(...finalCandidates) : Math.max(...validReadings);
        calculatedNewMeter = highestReading;
        isHighestSelected = records.length > 1 || validReadings.length > 1;

        if (records.length > 1) {
          sourceDescription = `🔝 Maior leitura final entre ${records.length} registros da planilha (${highestReading.toLocaleString('pt-BR')} ${matched.meterUnit})`;
        } else {
          sourceDescription = `Coluna ${records[0].sourceCol} (Leitura Final: ${highestReading.toLocaleString('pt-BR')})`;
        }

        // Detecção de Anomalia:
        // Se um Cavalo tem > 10.000 KM e o usuário digitou um número pequeno (ex: 200 a 1.200),
        // é provável que seja a rodagem do dia e não o odômetro acumulado
        if (matched.type === 'cavalo' && matched.currentMeter > 10000 && highestReading > 0 && highestReading < 2000) {
          isSuspiciousLow = true;
        }
      }

      // Validação rigorosa do novo valor
      const valCheck = validateAndSanitizeMeter(calculatedNewMeter, matched, {
        isBatchSync: true,
        allowZeroForCarreta: true,
      });

      const diff = calculatedNewMeter - matched.currentMeter;
      let status: 'valid' | 'no_change' | 'suspicious_low' | 'excessive_period' | 'blocked_format' = 'valid';
      let validationMessage = '';

      if (!valCheck.isValid) {
        if (valCheck.anomalyType === 'excessive_period') {
          status = 'excessive_period';
        } else {
          status = 'blocked_format';
        }
        validationMessage = valCheck.error || 'Valor fora dos limites ou formato incorreto.';
      } else if (diff === 0) {
        status = 'no_change';
      } else if (isSuspiciousLow) {
        status = 'suspicious_low';
      }

      const sortedReadings = [...validReadings].sort((a, b) => a - b);

      results.push({
        plate: matched.plate,
        foundVehicle: matched,
        targetType,
        previousMeter: matched.currentMeter,
        newMeter: calculatedNewMeter,
        diff,
        unit: matched.meterUnit,
        sourceColumn: sourceDescription,
        isIncrementApplied: isIncrement,
        status,
        validationMessage,
        isDecimalTruncationFixed: valCheck.isDecimalTruncationFixed,
        rawRow: records[0]?.row,
        rowCount: records.length,
        detectedReadings: sortedReadings,
        isHighestSelected,
      });
    });

    return results;
  };

  // 1. Sincronizar via Google Sheets
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setErrorMessage('Por favor, informe a URL ou link da sua planilha do Google Sheets.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setPreviewList([]);

    try {
      localStorage.setItem(STORAGE_KEY_GSHEET_URL, googleSheetUrl.trim());

      // Normalizar link do Google Sheets para formato CSV se for o link de edição normal
      let fetchUrl = googleSheetUrl.trim();
      if (fetchUrl.includes('docs.google.com/spreadsheets')) {
        if (!fetchUrl.includes('pub?output=csv') && !fetchUrl.includes('export?format=csv')) {
          // Converte link padrão "/d/ID/edit..." para formato de exportação CSV
          const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            const sheetId = match[1];
            // Se tiver gid
            const gidMatch = fetchUrl.match(/gid=([0-9]+)/);
            const gid = gidMatch ? `&gid=${gidMatch[1]}` : '';
            fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid}`;
          }
        }
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(
          `Falha ao acessar a planilha (${response.status}). Verifique se a planilha está marcada como Pública na Web (Arquivo > Compartilhar > Publicar na Web > CSV).`
        );
      }

      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const parsed = parseRowsToPreview(jsonData);
      setCachedRawRows(jsonData);
      setPreviewList(parsed);

      if (parsed.length === 0) {
        setErrorMessage('Nenhuma linha correspondente a placas da frota foi encontrada na planilha.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar planilha:', err);
      setErrorMessage(
        err.message || 'Erro ao conectar à planilha. Certifique-se de que o link é público e está publicado na Web como CSV.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Upload de Arquivo Local (.xlsx / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    setPreviewList([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        setCachedRawRows(jsonData);
        const parsed = parseRowsToPreview(jsonData);
        setPreviewList(parsed);
      } catch (err: any) {
        console.error('Erro ao ler arquivo:', err);
        setErrorMessage('Falha ao processar o arquivo Excel/CSV. Verifique o formato do arquivo.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. Processar texto colado (Ctrl+V ou digitação de Placa e KM / Horas)
  const processPastedLines = (
    text: string,
    mode: 'odometer' | 'daily_increment',
    syncCarretas: boolean
  ) => {
    if (!text.trim()) {
      setErrorMessage('Cole os dados copiados da sua planilha na caixa de texto.');
      return;
    }

    try {
      const rawLines = text.trim().split('\n');
      const rows: any[] = [];
      const plateRegex = /([a-zA-Z]{3}[-\s]?[0-9][a-zA-Z0-9][0-9]{2})/i;

      rawLines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        // Ignora cabeçalhos comuns como "PLACA KM", "PLACA / KM", etc.
        if (/^placa[\s/\\;,|\-]+(km|horas?|horimetro|leitura|valor|odometro)/i.test(line)) {
          return;
        }

        let plate = '';
        let valStr = '';

        // Tenta capturar placa (padrão antigo ou Mercosul)
        const match = line.match(plateRegex);
        if (match) {
          const rawMatch = match[1].replace(/\s+/g, '-').toUpperCase();
          plate = rawMatch.includes('-')
            ? rawMatch
            : `${rawMatch.slice(0, 3)}-${rawMatch.slice(3)}`;

          // Remove a placa da linha e extrai o valor numérico restante
          const rest = line.replace(match[0], '').replace(/[/:;=\-_|]/g, ' ').trim();
          const numMatch = rest.match(/([0-9][0-9.,]*)/);
          valStr = numMatch ? numMatch[1] : '';
        } else {
          // Fallback para separadores
          const sep = line.includes('\t')
            ? '\t'
            : line.includes(';')
            ? ';'
            : line.includes('|')
            ? '|'
            : line.includes('/')
            ? '/'
            : line.includes(',')
            ? ','
            : /\s+/;
          const parts = line.split(sep).map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            plate = parts[0].toUpperCase();
            valStr = parts[parts.length - 1];
          }
        }

        if (!plate || !valStr) return;

        const cleanP = cleanPlate(plate);
        const isCarreta = vehicles.some((v) => v.type === 'carreta' && cleanPlate(v.plate) === cleanP);
        const isCavalo = vehicles.some((v) => v.type === 'cavalo' && cleanPlate(v.plate) === cleanP);
        const isTk = vehicles.some((v) => v.type === 'tk' && cleanPlate(v.plate) === cleanP);

        const mentionsKm = /km|carreta|reboque|hodo|odomet/i.test(line);
        const mentionsHours = /hora|horim|tk|diesel|frio/i.test(line);

        const treatAsCarreta = (syncCarretas && isCarreta) || (isCarreta && !isTk && !isCavalo) || (mentionsKm && isCarreta);
        const treatAsCavalo = isCavalo && !treatAsCarreta && (!mentionsHours || !isTk);

        if (treatAsCarreta) {
          rows.push({
            Placa: plate,
            CARRETA: plate,
            'PLACA CARRETA': plate,
            KM: valStr,
            'KM CARRETA': valStr,
            'HODOMETRO CARRETA': valStr,
            'HODOMETRO FINAL': valStr,
            'KM FINAL': valStr,
            Horas_ou_KM: valStr,
            Valor: valStr,
          });
        } else if (treatAsCavalo) {
          rows.push({
            Placa: plate,
            CAVALO: plate,
            'PLACA CAVALO': plate,
            KM: valStr,
            'HODOMETRO FINAL': valStr,
            'KM FINAL': valStr,
            Horas_ou_KM: valStr,
            Valor: valStr,
          });
        } else {
          // TK ou Genérico
          rows.push({
            Placa: plate,
            'PLACA TK': plate,
            TK: plate,
            HORAS: valStr,
            'HORAS TK': valStr,
            'HORIMETRO FINAL': valStr,
            Horas_ou_KM: valStr,
            Valor: valStr,
          });
        }
      });

      if (rows.length === 0) {
        setErrorMessage(
          'Nenhuma placa e leitura numérica válida foram identificadas no texto colado. Exemplos aceitos: "EKH-7453 40.900", "EKH-7453 / 40.900" ou colunas do Excel.'
        );
        return;
      }

      setErrorMessage(null);
      setCachedRawRows(rows);
      const parsed = parseRowsToPreview(rows, mode, syncCarretas);
      setPreviewList(parsed);
    } catch (err: any) {
      console.error('Erro ao processar texto colado:', err);
      setErrorMessage('Não foi possível interpretar o texto colado. Verifique os dados e tente novamente.');
    }
  };

  const handleProcessPasteText = () => {
    processPastedLines(pasteText, inputMode, syncCarretaKm);
  };

  // Alternar modo de interpretação (Total vs Incremento) e reprocessar imediatamente
  const handleModeChange = (newMode: 'odometer' | 'daily_increment') => {
    setInputMode(newMode);
    if (activeTab === 'paste' && pasteText.trim()) {
      processPastedLines(pasteText, newMode, syncCarretaKm);
    } else if (cachedRawRows.length > 0) {
      const reParsed = parseRowsToPreview(cachedRawRows, newMode, syncCarretaKm);
      setPreviewList(reParsed);
    }
  };

  // Alternar sincronização de KM de Carretas (30K/50K) e reprocessar imediatamente
  const handleToggleSyncCarretas = () => {
    const nextVal = !syncCarretaKm;
    setSyncCarretaKm(nextVal);
    if (activeTab === 'paste' && pasteText.trim()) {
      processPastedLines(pasteText, inputMode, nextVal);
    } else if (cachedRawRows.length > 0) {
      const reParsed = parseRowsToPreview(cachedRawRows, inputMode, nextVal);
      setPreviewList(reParsed);
    }
  };

  // Alternar um veículo individual para soma (ex: quando detectado como suspicious_low)
  const handleToggleSingleItemIncrement = (index: number) => {
    setPreviewList((prev) =>
      prev.map((item, i) => {
        if (i !== index || !item.foundVehicle) return item;
        const currentIsIncrement = !!item.isIncrementApplied;
        const targetIsIncrement = !currentIsIncrement;

        // Extrai valor para cálculo
        let numVal = item.newMeter;
        if (item.detectedReadings && item.detectedReadings.length > 0) {
          numVal = targetIsIncrement
            ? item.detectedReadings.reduce((a, b) => a + b, 0)
            : Math.max(...item.detectedReadings);
        } else {
          const rawMeterVal = item.rawRow ? Object.values(item.rawRow)[1] : item.newMeter;
          let parsed = typeof rawMeterVal === 'number' ? rawMeterVal : parseFloat(String(rawMeterVal).replace(/[^0-9.]/g, ''));
          numVal = !isNaN(parsed) ? parsed : (item.diff > 0 ? item.diff : item.newMeter);
        }

        const recalculatedNewMeter = targetIsIncrement
          ? item.foundVehicle.currentMeter + numVal
          : numVal;

        const newDiff = recalculatedNewMeter - item.foundVehicle.currentMeter;

        return {
          ...item,
          newMeter: recalculatedNewMeter,
          diff: newDiff,
          isIncrementApplied: targetIsIncrement,
          status: newDiff === 0 ? 'no_change' : 'valid',
        };
      })
    );
  };

  // Baixar Modelo Oficial de Planilha Diária no formato: CAVALO | CARRETA | PLACA TK | HODOMETRO INICIAL | HODOMETRO FINAL | HORIMETRO INICIAL | HORIMETRO FINAL
  const handleDownloadTemplate = () => {
    const cavalos = vehicles.filter((v) => v.type === 'cavalo');
    const tks = vehicles.filter((v) => v.type === 'tk');

    const templateData: any[] = [];
    const processedTkIds = new Set<string>();

    // 1. Linhas dos Cavalos com respectivos TKs e Carretas
    cavalos.forEach((cav) => {
      const coupledTk = tks.find(
        (t) =>
          t.plate === cav.coupledTkPlate ||
          cleanPlate(t.plate) === cleanPlate(cav.coupledTkPlate || '') ||
          TRUCK_TO_TK_MAPPING[cav.plate] === t.plate
      );
      if (coupledTk) processedTkIds.add(coupledTk.id);

      templateData.push({
        CAVALO: cav.plate,
        CARRETA: cav.coupledCarretaPlate || '',
        'PLACA TK': coupledTk ? coupledTk.plate : '',
        'HODOMETRO INICIAL': cav.currentMeter,
        'HODOMETRO FINAL': '',
        'HORIMETRO INICIAL': coupledTk ? coupledTk.currentMeter : '',
        'HORIMETRO FINAL': '',
        DATA_LEITURA: new Date().toISOString().split('T')[0],
        RESPONSAVEL: '',
      });
    });

    // 2. Adiciona as demais unidades TK da frota (refrigeração / carretas)
    tks.forEach((tk) => {
      if (!processedTkIds.has(tk.id)) {
        templateData.push({
          CAVALO: '',
          CARRETA: tk.coupledCarretaPlate || '',
          'PLACA TK': tk.plate,
          'HODOMETRO INICIAL': '',
          'HODOMETRO FINAL': '',
          'HORIMETRO INICIAL': tk.currentMeter,
          'HORIMETRO FINAL': '',
          DATA_LEITURA: new Date().toISOString().split('T')[0],
          RESPONSAVEL: '',
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Diaria_Cavalo_Carreta_TK');
    XLSX.writeFile(wb, `Planilha_Diaria_Padrao_Cavalo_TK_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Baixar Modelo Oficial de Planilha de Carretas (Trava 60K • Atenção 50K) com todas as carretas cadastradas
  const handleDownloadCarretaTemplate = () => {
    const carretas = vehicles.filter((v) => v.type === 'carreta');
    const templateData = carretas.map((crt) => {
      return {
        CARRETA: crt.plate,
        'TRAVA OFICIAL': `${(crt.carretaTaraKm || 60000).toLocaleString('pt-BR')} KM`,
        'ALERTA ATENCAO': '50.000 KM',
        'HODOMETRO ATUAL NO CICLO': crt.currentMeter,
        'NOVO HODOMETRO (KM)': '',
        DATA_LEITURA: new Date().toISOString().split('T')[0],
        RESPONSAVEL: '',
        OBSERVACOES: '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Carretas_Trava_60K');
    XLSX.writeFile(wb, `Planilha_Carretas_Trava_60K_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Aplicar atualizações na frota
  const handleApplyUpdates = () => {
    // Sincroniza todos os veículos válidos (Cavalos, Carretas e TKs)
    // Trava de segurança absoluta: TKs nunca podem ser atualizados para valor inferior à última preventiva realizada
    const validUpdates = previewList.filter((p) => {
      if (p.status !== 'valid' && p.status !== 'suspicious_low' && p.status !== 'no_change') return false;
      if (p.newMeter <= 0) return false;
      if (p.targetType === 'tk' || p.foundVehicle?.type === 'tk') {
        const lastPrev = getTkLastPreventivaMeter(p.plate, p.foundVehicle);
        if (lastPrev > 0 && p.newMeter < lastPrev) {
          return false;
        }
      }
      return true;
    });
    if (validUpdates.length === 0) return;

    const updates = validUpdates.map((item) => ({
      plate: item.plate,
      vehicleId: item.foundVehicle?.id,
      vehicleType: item.targetType || (item.foundVehicle?.type as any),
      newMeter: item.newMeter,
      note: `Atualizado via Planilha Diária (${new Date().toLocaleDateString('pt-BR')})`,
    }));

    onBatchUpdateMeters(updates);

    const nowStr = new Date().toLocaleString('pt-BR');
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, nowStr);
    setLastSyncTime(nowStr);
    onClose();
  };

  const cavalosCount = vehicles.filter((v) => v.type === 'cavalo').length;
  const carretasCount = vehicles.filter((v) => v.type === 'carreta').length;
  const tksCount = vehicles.filter((v) => v.type === 'tk').length;

  const previewCavalosCount = previewList.filter((p) => p.targetType === 'cavalo').length;
  const previewCarretasCount = previewList.filter((p) => p.targetType === 'carreta').length;
  const previewTksCount = previewList.filter((p) => p.targetType === 'tk').length;

  const filteredPreviewList = previewList.filter((item) => {
    if (selectedCategoryFilter === 'all') return true;
    return item.targetType === selectedCategoryFilter;
  });

  const validCount = previewList.filter((p) => (p.status === 'valid' || p.status === 'suspicious_low') && p.newMeter > 0).length;
  const validFilteredCount = filteredPreviewList.filter((p) => (p.status === 'valid' || p.status === 'suspicious_low') && p.newMeter > 0).length;
  const suspiciousCount = previewList.filter((p) => p.status === 'suspicious_low').length;
  const noChangeCount = previewList.filter((p) => p.status === 'no_change').length;
  const notFoundCount = previewList.filter((p) => p.status === 'not_found').length;
  const blockedCount = previewList.filter((p) => p.status === 'blocked_format' || p.status === 'excessive_period' || p.status === 'invalid_number').length;
  const multiRecordCount = previewList.filter((p) => (p.rowCount || 1) > 1).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel border border-slate-700/70 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 bg-slate-950/85 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Sincronizar Planilha Diária de Horas
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Google Sheets & Excel
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Puxe as medições diárias por placa de forma automática ou via upload
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('gsheet');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'gsheet'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Google Sheets (Automático)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('file');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Arquivo Excel / CSV</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('paste');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Colar Dados (Ctrl+V)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/40 transition cursor-pointer active:scale-95"
              title="Baixar planilha Excel com todas as placas, tipos, portas e eixos formatada para preenchimento diário"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Modelo Diário (Cavalo/TK)</span>
            </button>

            <button
              onClick={handleDownloadCarretaTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800/50 transition cursor-pointer active:scale-95"
              title="Baixar Modelo Oficial com todas as 31 Carretas (Trava 60K • Atenção 50K) para preenchimento de KM"
            >
              <Container className="w-3.5 h-3.5 text-amber-400" />
              <span>Planilha Carretas (31) - Trava 60K</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Caixa de Explicação Didática: Como o sistema diferencia KM vs Horas */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            {/* Destaque Inteligência de Seleção: Puxar Maior/Mais Atual */}
            <div className="bg-emerald-950/50 border border-emerald-800/70 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-300">
                    Inteligência Ativa: Padrão Diário Cavalo/Carreta/TK + Leitura Mais Alta Automática
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-900/90 text-emerald-300 border border-emerald-700">
                    ATIVADO
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-emerald-800/40 font-mono text-[10px] text-emerald-300/90 flex flex-wrap gap-2 items-center">
                  <span className="font-semibold text-white">Padrão Reconhecido:</span>
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">CAVALO ➔ KM</span>
                  <span className="bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-600 font-bold">CARRETA ➔ KM (Trava 60K)</span>
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">HODOMETRO INICIAL</span>
                  <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-600 font-bold">HODOMETRO FINAL</span>
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">HORIMETRO INICIAL</span>
                  <span className="bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-600 font-bold">HORIMETRO FINAL ➔ TKS</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  • <strong>Aplicações Direcionadas:</strong> A coluna <em>CAVALO</em> atualiza os cavalos com o maior <strong>Hodômetro Final</strong> (KM). A coluna <em>CARRETA</em> atualiza o KM do semirreboque (Trava 30K/50K). A coluna <em>PLACA TK</em> atualiza o equipamento no módulo <strong>TKs</strong> com o maior <strong>Horímetro Final</strong> (Horas).<br />
                  • <strong>Seleção do Mais Alto / Atual:</strong> Se houver colunas Inicial e Final ou múltiplas viagens no mesmo dia para a mesma placa, o sistema seleciona automaticamente o <strong>maior valor medido</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Como o sistema sabe se você forneceu KM ou HORAS:
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/90 border border-sky-900/60 p-3 rounded-xl flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 mt-0.5">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sky-300 font-bold">Cavalos Mecânicos (CVM)</strong>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                      Unidade: KM
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    O sistema consulta o cadastro da placa no banco de dados da frota. Sabendo que é um Cavalo, grava a medição automaticamente no <strong>Odômetro (KM)</strong>. Se sua planilha tiver uma coluna de KM, ele puxa direto dela.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-amber-900/60 p-3 rounded-xl flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                  <Container className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-amber-300 font-bold">Carretas ({carretasCount})</strong>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                      Unidade: KM · 30K/50K
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Identifica a coluna <strong>CARRETA</strong> ou a carreta vinculada ao cavalo. Atualiza o <strong>Odômetro / KM Rodado no ciclo da trava de 30.000 KM ou 50.000 KM</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-cyan-900/60 p-3 rounded-xl flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
                  <Snowflake className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-cyan-300 font-bold">Thermo King (TK Frios)</strong>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Unidade: HORAS
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    O sistema reconhece as placas de TK e direciona a medição diretamente para o <strong>Horímetro (Horas de motor)</strong>. Se sua planilha tiver uma coluna específica para TK/Horas, ele prioriza essa coluna.
                  </p>
                </div>
              </div>
            </div>

            {/* Seletor de Modo de Entrada: Total do Painel vs Rodagem/Horas do Dia */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Como os números estão informados na sua planilha?
                </span>
                <span className="text-[11px] text-slate-400">
                  Defina se você informou a leitura total do painel ou o quanto o veículo rodou/trabalhou hoje:
                </span>
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => handleModeChange('odometer')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    inputMode === 'odometer'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="O número na planilha é o total acumulado marcado no painel/horímetro"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Leitura Total (Painel)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('daily_increment')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    inputMode === 'daily_increment'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="O número na planilha é o que rodou/trabalhou hoje e o sistema soma ao saldo anterior"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Rodagem/Horas do Dia (Somar)</span>
                </button>
              </div>
            </div>

            {/* Sincronização de KM da Carreta (30K/50K) */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">
                    Sincronizar KM das Carretas
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      syncCarretaKm
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {syncCarretaKm ? '✓ ATIVADO' : '✕ DESATIVADO'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Lê e sincroniza o odômetro/rodagem das 31 carretas na coluna CARRETA ou pelo cavalo engatado (Trava 60.000 KM • Atenção aos 50.000 KM):
                </span>
              </div>

              <button
                type="button"
                id="btn-toggle-sync-carretas"
                onClick={handleToggleSyncCarretas}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-sm ${
                  syncCarretaKm
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Clique para ativar/desativar a sincronização de KM das Carretas"
              >
                <Container className="w-4 h-4" />
                <span>Carretas ({carretasCount}) - Trava 60K</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    syncCarretaKm
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {syncCarretaKm ? '✓ ATIVADO' : '✕ DESATIVADO'}
                </span>
              </button>
            </div>
          </div>

          {/* Aba 1: Google Sheets */}
          {activeTab === 'gsheet' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Como vincular sua planilha do Google Sheets para puxar direto:
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Você pode preencher sua planilha normalmente todos os dias e com um clique puxar tudo para o site:
                    </p>
                  </div>
                  {lastSyncTime && (
                    <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-mono shrink-0">
                      Último sync: {lastSyncTime}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-300 pt-1">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="font-bold text-emerald-400 block mb-1">1. No Google Sheets</span>
                    Clique em <strong>Arquivo</strong> &gt; <strong>Compartilhar</strong> &gt; <strong>Publicar na Web</strong>.
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="font-bold text-emerald-400 block mb-1">2. Formato CSV</span>
                    Escolha a aba das horas e selecione o formato <strong>Valores separados por vírgula (.csv)</strong>.
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="font-bold text-emerald-400 block mb-1">3. Cole o Link</span>
                    Copie o link gerado e cole no campo abaixo. O sistema busca e atualiza as placas na hora!
                  </div>
                </div>

                {/* Input de URL */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Link da Planilha do Google Sheets (Publicada ou Compartilhada):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={googleSheetUrl}
                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={handleFetchGoogleSheet}
                      disabled={isLoading}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{isLoading ? 'Puxando...' : 'Buscar e Sincronizar'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    * O sistema reconhece colunas com os nomes <strong>PLACA</strong> e <strong>HORAS</strong> / <strong>HORIMETRO</strong> / <strong>KM</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aba 2: Upload de Arquivo Local */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/40 rounded-2xl p-8 text-center transition cursor-pointer group relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Arraste ou clique para selecionar sua planilha diária
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Formatos aceitos: <strong>.xlsx</strong> (Excel), <strong>.xls</strong> ou <strong>.csv</strong>.
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-950/50 px-3 py-1 rounded-lg border border-emerald-800/40">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Dica: Use o botão "Baixar Modelo Oficial" para ter as colunas certas</span>
                </div>
              </div>
            </div>
          )}

          {/* Aba 3: Colar Dados */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Cole os dados no formato <span className="text-emerald-400">Placa e KM / Horas</span> (qualquer separador):
                </label>
                <span className="text-[11px] text-slate-400">
                  Aceita espaço, barra (/), tabulação ou vírgula
                </span>
              </div>
              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Exemplos aceitos:&#10;EKH-7453 40.900&#10;EKH-7453 / 40.900&#10;FFW-5963 1500&#10;DUE-4590 243.300&#10;TCK-6F97 125.400&#10;Ou copie duas colunas diretamente do Excel/Google Sheets"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleProcessPasteText}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Processar Dados Colados</span>
                </button>
                <p className="text-[11px] text-slate-400">
                  Dica: Para atualizar odômetro de Carreta (30K/50K), mantenha o botão amarelo <strong className="text-amber-400">"Carretas - 30K/50K"</strong> ativado acima.
                </p>
              </div>
            </div>
          )}

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Atenção ao importar</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Pré-visualização da Leitura / Atualização */}
          {previewList.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Resultado da Leitura da Planilha ({previewList.length} itens)
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-bold">
                    ✓ {validCount} a atualizar
                  </span>
                  {multiRecordCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800/50 font-bold">
                      🔝 {multiRecordCount} com múltiplos registros (maior puxado)
                    </span>
                  )}
                  {suspiciousCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800/50 font-bold">
                      ⚠ {suspiciousCount} com valor baixo (rodagem diária)
                    </span>
                  )}
                  {noChangeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      = {noChangeCount} sem alteração
                    </span>
                  )}
                  {notFoundCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800/50">
                      ✕ {notFoundCount} não cadastradas
                    </span>
                  )}
                  {blockedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800/80 font-bold animate-pulse">
                      🚫 {blockedCount} bloqueados por segurança
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Filtro de Categoria: Todos | Cavalos | Carretas (31) - 30K/50K | TKs */}
              <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mr-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    Filtrar por Categoria:
                  </span>

                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Todos ({previewList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('cavalo')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        selectedCategoryFilter === 'cavalo'
                          ? 'bg-sky-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Cavalos ({previewCavalosCount})</span>
                    </button>
                    <button
                      type="button"
                      id="filter-preview-carretas"
                      onClick={() => setSelectedCategoryFilter('carreta')}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        selectedCategoryFilter === 'carreta'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Container className="w-3.5 h-3.5" />
                      <span>Carretas ({previewCarretasCount}) - Trava 60K</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('tk')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        selectedCategoryFilter === 'tk'
                          ? 'bg-cyan-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>TKs ({previewTksCount})</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  Exibindo <strong>{filteredPreviewList.length}</strong> de {previewList.length} registros
                </div>
              </div>

              {/* Tabela de Prévia */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Placa</th>
                      <th className="py-2.5 px-3">Tipo / Porte</th>
                      <th className="py-2.5 px-3 text-right">Leitura Anterior</th>
                      <th className="py-2.5 px-3 text-right">Nova Leitura</th>
                      <th className="py-2.5 px-3 text-right">Variação</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredPreviewList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                          Nenhum veículo da categoria selecionada ({selectedCategoryFilter.toUpperCase()}) foi encontrado na planilha lida.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/50">
                          <td className="py-2 px-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{item.plate}</span>
                              {item.foundVehicle?.fleetNumber && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({item.foundVehicle.fleetNumber})
                                </span>
                              )}
                            </div>
                            {item.rowCount && item.rowCount > 1 && (
                              <div className="mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/60 font-sans">
                                  🔝 Maior de {item.rowCount} registros
                                </span>
                              </div>
                            )}
                            {item.sourceColumn && (
                              <span className="text-[9px] text-slate-500 font-sans block mt-0.5">
                                {item.sourceColumn}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-sans">
                            {item.foundVehicle ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                                    item.foundVehicle.type === 'cavalo'
                                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                      : item.foundVehicle.type === 'tk'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {item.foundVehicle.type === 'cavalo' ? (
                                    <>
                                      <Truck className="w-3 h-3" />
                                      <span>Cavalo (KM)</span>
                                    </>
                                  ) : item.foundVehicle.type === 'tk' ? (
                                    <>
                                      <Snowflake className="w-3 h-3" />
                                      <span>TK (HORAS)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Container className="w-3 h-3" />
                                      <span>Carreta (KM)</span>
                                    </>
                                  )}
                                </span>

                                {item.foundVehicle.type === 'carreta' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono">
                                    Trava 60K (Atenção 50K)
                                  </span>
                                )}

                                {item.foundVehicle.bodySize && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 font-bold">
                                    {item.foundVehicle.bodySize}
                                  </span>
                                )}
                                {item.foundVehicle.axlesConfig && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-950/60 text-teal-300 border border-teal-800/60 font-bold">
                                    {item.foundVehicle.axlesConfig}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {item.foundVehicle
                            ? `${item.previousMeter.toLocaleString('pt-BR')} ${item.unit}`
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400">
                          {item.status !== 'invalid_number' ? (
                            <div>
                              <span>{item.newMeter.toLocaleString('pt-BR')} {item.unit}</span>
                              {item.isIncrementApplied && (
                                <span className="block text-[9px] font-sans font-normal text-amber-400">
                                  (somado ao anterior)
                                </span>
                              )}
                              {item.rowCount && item.rowCount > 1 && item.detectedReadings && (
                                <span
                                  className="block text-[9px] font-sans font-normal text-slate-400 mt-0.5"
                                  title={`Todas as medições detectadas para esta placa: ${item.detectedReadings.map((r) => r.toLocaleString('pt-BR')).join(', ')}`}
                                >
                                  Lidas: {item.detectedReadings.map((r) => r.toLocaleString('pt-BR')).join(' → ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            'Inválido'
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {item.status === 'valid' || item.status === 'suspicious_low' ? (
                            <span
                              className={`text-[11px] font-bold ${
                                item.diff > 0 ? 'text-amber-300' : 'text-slate-400'
                              }`}
                            >
                              {item.diff > 0 ? `+${item.diff.toLocaleString('pt-BR')}` : item.diff} {item.unit}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.status === 'valid' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans">
                              Pronto para aplicar
                            </span>
                          )}
                          {item.status === 'suspicious_low' && (
                            <div className="flex flex-col items-center gap-1 font-sans">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ⚠️ Parece rodagem do dia
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleSingleItemIncrement(idx)}
                                className="text-[10px] text-amber-400 underline hover:text-amber-300 cursor-pointer"
                              >
                                Somar +{item.newMeter} ao total
                              </button>
                            </div>
                          )}
                          {item.status === 'no_change' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 font-sans">
                              Sem alteração
                            </span>
                          )}
                          {item.status === 'not_found' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                              Não encontrada
                            </span>
                          )}
                          {item.status === 'blocked_format' && (
                            <div className="flex flex-col items-center gap-0.5 font-sans" title={item.validationMessage}>
                              {item.validationMessage?.includes('Bloqueio de Horímetro TK') || item.validationMessage?.includes('preventiva') ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600/30 text-rose-200 border border-rose-500/60 shadow-sm animate-pulse">
                                  🚫 Menor que Prev. TK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  🚫 Formato Bloqueado
                                </span>
                              )}
                              <span className="text-[9px] text-rose-400 font-normal max-w-[150px] truncate" title={item.validationMessage}>
                                {item.validationMessage || 'Valor inválido ou truncado'}
                              </span>
                            </div>
                          )}
                          {item.status === 'excessive_period' && (
                            <div className="flex flex-col items-center gap-0.5 font-sans" title={item.validationMessage}>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                ⚠️ Salto Excessivo
                              </span>
                              <span className="text-[9px] text-amber-400 font-normal max-w-[150px] truncate">
                                {item.validationMessage || 'Excede limite diário'}
                              </span>
                            </div>
                          )}
                          {item.status === 'invalid_number' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-sans">
                              Valor inválido
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-400">
            {validCount > 0 ? (
              <span>
                <strong>{validCount}</strong> unidades serão atualizadas no sistema e nos relatórios.
              </span>
            ) : (
              <span>Nenhuma atualização pendente. Busque ou envie a planilha acima.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleApplyUpdates}
              disabled={validCount === 0}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aplicar Atualizações na Frota ({validCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

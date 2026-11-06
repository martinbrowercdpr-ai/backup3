import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { AlertBanner } from './components/AlertBanner';
import { FleetList } from './components/FleetList';
import { MaintenanceForecastDashboard } from './components/MaintenanceForecastDashboard';
import { UpdateMeterModal } from './components/UpdateMeterModal';
import { RegisterMaintenanceModal } from './components/RegisterMaintenanceModal';
import { VehicleDetailModal } from './components/VehicleDetailModal';
import { AddVehicleModal } from './components/AddVehicleModal';
import { GlobalHistoryModal } from './components/GlobalHistoryModal';
import { EmailDispatchModal } from './components/EmailDispatchModal';
import { DailyHoursSyncModal } from './components/DailyHoursSyncModal';
import { ChangeLogModal } from './components/ChangeLogModal';
import { ScaniaRevisionCatalogModal } from './components/ScaniaRevisionCatalogModal';
import { Manage8MonthsModal } from './components/Manage8MonthsModal';
import { AbastecimentoSyncModal } from './components/AbastecimentoSyncModal';
import { Vehicle, MaintenanceRecord, FilterOptions, VehicleType, AlertLevel, ChangeLogEntry } from './types';
import { INITIAL_VEHICLES, INITIAL_MAINTENANCE_HISTORY, CAVALO_REAL_KM, CARRETA_REAL_KM, TK_REAL_HOURS, TRUCK_TO_TK_MAPPING, TK_TO_TRUCK_MAPPING } from './data/initialData';
import { INITIAL_CHANGE_LOGS } from './data/initialChangeLogs';
import { CAVALO_REVISIONS_HISTORY } from './data/cavaloRevisionsHistory';
import { CARRETA_REVISIONS_HISTORY } from './data/carretaRevisionsHistory';
import { exportFleetToExcel, exportFleetToPdf } from './utils/exportReports';
import { isCarreta50k, isVehicleTimeBased, addMonthsToDate, TIME_BASED_CAVALO_PLATES } from './utils/maintenanceCalculations';
import { reconcileVehiclesWithHistory } from './utils/maintenanceForecasting';
import { validateAndSanitizeMeter, getTkLastPreventivaMeter } from './utils/meterValidation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import {
  subscribeToVehicles,
  subscribeToHistory,
  subscribeToChangeLogs,
  saveVehicleToCloud,
  saveMultipleVehiclesToCloud,
  saveMaintenanceRecordToCloud,
  saveMultipleHistoryRecordsToCloud,
  deleteVehicleFromCloud,
  deleteHistoryRecordFromCloud,
  clearHistoryByTypeFromCloud,
  saveChangeLogToCloud,
  saveMultipleChangeLogsToCloud,
  seedCloudIfEmpty,
  fetchAllCloudData,
} from './services/firebaseSyncService';
import { testFirestoreConnection } from './firebase';

const STORAGE_KEY_VEHICLES = 'fleet_maintenance_vehicles_v27';
const STORAGE_KEY_HISTORY = 'fleet_maintenance_history_v27';
const STORAGE_KEY_CHANGELOGS = 'fleet_maintenance_changelogs_v1';

export default function App() {
  // Visualização ativa: 'fleet' (Painel da Frota) ou 'forecast' (Previsão & Orçamento)
  const [activeView, setActiveView] = useState<'fleet' | 'forecast'>('fleet');

  // Estado das frotas com persistência local
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22', 'v23', 'v24', 'v25', 'v26'].forEach((v) => {
        localStorage.removeItem(`fleet_maintenance_vehicles_${v}`);
      });
      const saved = localStorage.getItem(STORAGE_KEY_VEHICLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove marcas e modelos de TODAS as placas da frota conforme solicitado pelo usuário
          // E sanitiza medições (ex: 805.419 que foram convertidas erroneamente com decimais em vez de 805419)
          return parsed.map((v: Vehicle) => {
            let meter = typeof v.currentMeter === 'number' && !isNaN(v.currentMeter) ? v.currentMeter : 0;
            
            // Substituição oficial de placas solicitada pelo usuário:
            // EKH-9428 -> TCK-6F83
            // EKH-9424 -> TCK-6F97
            // FSG-7745 -> EGY-1481
            let plate = v.plate;
            let coupledTkPlate = v.coupledTkPlate;
            let coupledCarretaPlate = v.coupledCarretaPlate;

            if (plate === 'EKH-9428') plate = 'TCK-6F83';
            if (plate === 'EKH-9424') plate = 'TCK-6F97';
            if (plate === 'FSG-7745') plate = 'EGY-1481';
            if (coupledCarretaPlate === 'EKH-9428') coupledCarretaPlate = 'TCK-6F83';
            if (coupledCarretaPlate === 'EKH-9424') coupledCarretaPlate = 'TCK-6F97';
            if (coupledTkPlate === 'EKH-9428') coupledTkPlate = 'TCK-6F83';
            if (coupledTkPlate === 'EKH-9424') coupledTkPlate = 'TCK-6F97';

            if (v.type === 'cavalo') {
              // Corrige número truncado ou com ponto decimal de milhar (ex: 805.419 -> 805419)
              if (meter > 0 && meter < 2000) {
                const s = meter.toString();
                if (s.includes('.') && s.split('.')[1]?.length === 3) {
                  meter = Math.round(meter * 1000);
                } else if (CAVALO_REAL_KM[plate]) {
                  meter = CAVALO_REAL_KM[plate];
                }
              }

              // Normaliza a regra de ciclo Scania:
              // - Pós-S ou Pós-M: próxima é REVISAO X (+20.000 KM para travar o ciclo de 40.000 KM)
              // - Pós-L: próxima é REVISAO S (+40.000 KM direto sem parada para a X por ser completa já!)
              // - Pós-X: próxima é a grande revisão seguinte (+20.000 KM)
              // Normaliza a regra de ciclo Scania preservando dados salvos pelo usuário:
              const lastType = (v.lastMaintenanceType || '').toUpperCase();
              let nextType = v.nextRevisionType;
              const lastMeter = v.lastMaintenanceMeter || 0;
              let nextMeter = v.nextRevisionMeter;

              // Só calcula sugestão caso não exista valor salvo
              if (!nextType || !nextMeter) {
                if (lastType.includes('REVISAO S') || lastType.includes('REVISÃO S')) {
                  nextType = 'REVISAO X';
                  nextMeter = lastMeter + 20000;
                } else if (lastType.includes('REVISAO M') || lastType.includes('REVISÃO M')) {
                  nextType = 'REVISAO X';
                  nextMeter = lastMeter + 20000;
                } else if (lastType.includes('REVISAO L') || lastType.includes('REVISÃO L')) {
                  nextType = 'REVISAO S';
                  nextMeter = lastMeter + 40000;
                } else if (lastType.includes('REVISAO X') || lastType.includes('REVISÃO X')) {
                  nextType = 'REVISAO M';
                  nextMeter = lastMeter + 20000;
                } else {
                  nextType = 'REVISAO X';
                  nextMeter = lastMeter + 20000;
                }
              }

              if (plate === 'FSJ-8793' && !v.lastMaintenanceDate) {
                return {
                  ...v,
                  plate,
                  lastMaintenanceDate: '2026-03-20',
                  lastMaintenanceMeter: 465989,
                  lastMaintenanceType: 'REVISAO M',
                  nextRevisionDate: '2026-11-20',
                  nextRevisionMeter: 485989,
                  nextRevisionType: 'REVISAO X',
                  isTimeBasedRevision: true,
                  timeBasedIntervalMonths: 8,
                  coupledTkPlate: TRUCK_TO_TK_MAPPING[plate] || coupledTkPlate,
                  coupledCarretaPlate,
                  fleetNumber: plate,
                  brand: '',
                  model: '',
                  currentMeter: Math.round(meter),
                };
              }

              return {
                ...v,
                plate,
                coupledTkPlate: TRUCK_TO_TK_MAPPING[plate] || coupledTkPlate,
                coupledCarretaPlate,
                fleetNumber: /^(CAV|TK|CRT)-\d+/i.test(v.fleetNumber || '') ? plate : (v.fleetNumber || plate),
                brand: '',
                model: '',
                currentMeter: Math.round(meter),
                lastMaintenanceMeter: lastMeter,
                nextRevisionType: nextType,
                nextRevisionMeter: nextMeter,
              };
            } else if (v.type === 'carreta') {
              const defaultTaraKm = 60000;
              const taraKm = v.carretaTaraKm === 30000 || v.carretaTaraKm === 50000 ? 60000 : (v.carretaTaraKm || defaultTaraKm);
              const nextType = 'PREVENTIVA DE FREIOS (60.000 KM)';
              const currentMeter = typeof v.currentMeter === 'number' && !isNaN(v.currentMeter) ? v.currentMeter : 0;
              return {
                ...v,
                plate,
                fleetNumber: plate,
                brand: '',
                model: '',
                carretaTaraKm: taraKm,
                nextRevisionMeter: taraKm, // TRAVA FIXA DE 60.000 KM. NUNCA JOGA A MAIS!
                lastMaintenanceMeter: v.lastMaintenanceMeter || 0,
                kmSinceLastMaintenance: v.kmSinceLastMaintenance !== undefined ? v.kmSinceLastMaintenance : Math.round(currentMeter),
                nextRevisionType: nextType,
                currentMeter: Math.round(currentMeter),
                status: v.status || 'active',
              };
            } else if (v.type === 'tk') {
              if (meter > 100000 && TK_REAL_HOURS[plate]) {
                meter = TK_REAL_HOURS[plate];
              }
            }

            // Migração das placas TK dos caminhões para padrão EQF-xxxx e cura de horímetros anômalos (50/100h)
            if (v.type === 'tk') {
              if (TRUCK_TO_TK_MAPPING[plate]) {
                const truckPlate = plate;
                plate = TRUCK_TO_TK_MAPPING[truckPlate];
                coupledCarretaPlate = truckPlate;
                coupledTkPlate = truckPlate;
              } else if (TK_TO_TRUCK_MAPPING[plate]) {
                coupledCarretaPlate = TK_TO_TRUCK_MAPPING[plate];
                coupledTkPlate = TK_TO_TRUCK_MAPPING[plate];
              }

              const lastPrev = getTkLastPreventivaMeter(plate, v);
              const realH = TK_REAL_HOURS[plate] || 0;
              const minValidMeter = Math.max(lastPrev, realH);
              // Corrige placas com 50 ou 100 horas para sua medição real de fábrica/preventiva
              if (minValidMeter > 0 && (meter < 500 || meter < lastPrev)) {
                meter = minValidMeter;
              }
              if (lastPrev > 0 && (!v.lastMaintenanceMeter || v.lastMaintenanceMeter < lastPrev)) {
                v.lastMaintenanceMeter = lastPrev;
              }
            }

            return {
              ...v,
              plate,
              coupledTkPlate,
              coupledCarretaPlate,
              fleetNumber: /^(CAV|TK|CRT)-\d+/i.test(v.fleetNumber || '') ? plate : (v.type === 'tk' && TRUCK_TO_TK_MAPPING[v.fleetNumber] ? TRUCK_TO_TK_MAPPING[v.fleetNumber] : (v.fleetNumber || plate)),
              brand: '',
              model: '',
              lastMaintenanceMeter: v.lastMaintenanceMeter,
              currentMeter: Math.round(meter),
            };
          }).filter((v: Vehicle) => {
            const clean = v.plate.replace(/[^a-zA-Z0-9]/g, '');
            return !['FSG7745', 'EKH9428', 'EKH9424'].includes(clean);
          });
        }
      }
    } catch (e) {
      console.error('Erro ao ler localStorage de veículos:', e);
    }
    return INITIAL_VEHICLES;
  });

  // Estado do histórico com persistência local
  const [history, setHistory] = useState<MaintenanceRecord[]>(() => {
    try {
      ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22', 'v23', 'v24'].forEach((v) => {
        localStorage.removeItem(`fleet_maintenance_history_${v}`);
      });
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasOfficialCavalo = parsed.some((r: MaintenanceRecord) => r.id && r.id.startsWith('hist-cav-'));
          const hasOfficialCarreta = parsed.some((r: MaintenanceRecord) => r.id && r.id.startsWith('hist-crt-'));
          
          if (!hasOfficialCavalo || !hasOfficialCarreta) {
            const nonCavaloNonCarreta = parsed.filter((r: MaintenanceRecord) => r.vehicleType !== 'cavalo' && r.vehicleType !== 'carreta');
            const combined = [...CAVALO_REVISIONS_HISTORY, ...CARRETA_REVISIONS_HISTORY, ...nonCavaloNonCarreta];
            try {
              localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(combined));
            } catch (err) {
              console.error(err);
            }
            return combined;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler localStorage de histórico:', e);
    }
    return INITIAL_MAINTENANCE_HISTORY;
  });

  // Notificação Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Salvar no localStorage sempre que houver modificação
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
    } catch (e) {
      console.error('Erro ao persistir veículos:', e);
    }
  }, [vehicles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Erro ao persistir histórico:', e);
    }
  }, [history]);

  // Reconciliação automática do estado dos veículos com o histórico de manutenções
  useEffect(() => {
    if (!history || history.length === 0) return;
    setVehicles((prev) => {
      const reconciled = reconcileVehiclesWithHistory(prev, history);
      const hasChanges = reconciled.some((r, i) => {
        const p = prev[i];
        return (
          !p ||
          r.lastMaintenanceDate !== p.lastMaintenanceDate ||
          r.lastMaintenanceMeter !== p.lastMaintenanceMeter ||
          r.nextRevisionMeter !== p.nextRevisionMeter ||
          r.currentMeter !== p.currentMeter
        );
      });
      return hasChanges ? reconciled : prev;
    });
  }, [history]);


  // Log de Alterações e Rastreabilidade de KM e Manutenções
  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHANGELOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Erro ao ler changeLogs:', e);
    }
    return INITIAL_CHANGE_LOGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHANGELOGS, JSON.stringify(changeLogs));
    } catch (e) {
      console.error('Erro ao persistir changeLogs:', e);
    }
  }, [changeLogs]);

  // Estado da sincronização em tempo real (compartilhada entre todos os usuários)
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');

  // Sincronização automática em tempo real com o Firestore para todos que acessam o site
  useEffect(() => {
    let unsubscribeVehicles: (() => void) | null = null;
    let unsubscribeHistory: (() => void) | null = null;
    let unsubscribeLogs: (() => void) | null = null;
    let isMounted = true;

    async function initCloudSync() {
      try {
        const isConnected = await testFirestoreConnection();
        if (!isMounted) return;
        if (!isConnected) {
          setSyncStatus('offline');
        }

        // Se o banco estiver vazio na primeira execução, popula os dados oficiais
        await seedCloudIfEmpty(vehicles, history, changeLogs);

        // 1. Escuta em tempo real qualquer alteração nos veículos
        unsubscribeVehicles = subscribeToVehicles(
          (cloudVehicles) => {
            if (cloudVehicles && cloudVehicles.length > 0) {
              setVehicles(cloudVehicles);
              setSyncStatus('connected');
            }
          },
          () => setSyncStatus('offline')
        );

        // 2. Escuta em tempo real o histórico de manutenções
        unsubscribeHistory = subscribeToHistory(
          (cloudHistory) => {
            if (cloudHistory && cloudHistory.length > 0) {
              setHistory(cloudHistory);
              setSyncStatus('connected');
            }
          },
          () => setSyncStatus('offline')
        );

        // 3. Escuta em tempo real os logs de alterações
        unsubscribeLogs = subscribeToChangeLogs(
          (cloudLogs) => {
            if (cloudLogs && cloudLogs.length > 0) {
              setChangeLogs(cloudLogs);
              setSyncStatus('connected');
            }
          },
          () => setSyncStatus('offline')
        );
      } catch (err) {
        console.error('Erro ao conectar ao Firestore:', err);
        if (isMounted) setSyncStatus('offline');
      }
    }

    initCloudSync();

    return () => {
      isMounted = false;
      if (unsubscribeVehicles) unsubscribeVehicles();
      if (unsubscribeHistory) unsubscribeHistory();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []);

  // Forçar atualização manual da nuvem quando o usuário desejar
  const handleForceCloudRefresh = async () => {
    setSyncStatus('syncing');
    showToast('Atualizando dados em tempo real da nuvem Martin Brower...', 'info');
    try {
      const data = await fetchAllCloudData();
      if (data) {
        if (data.vehicles.length > 0) setVehicles(data.vehicles);
        if (data.history.length > 0) setHistory(data.history);
        if (data.changeLogs.length > 0) setChangeLogs(data.changeLogs);
        setSyncStatus('connected');
        showToast('Nuvem sincronizada! Dados mais recentes carregados.', 'success');
      } else {
        setSyncStatus('connected');
      }
    } catch (err) {
      console.error('Erro na sincronização manual:', err);
      setSyncStatus('offline');
      showToast('Falha temporária ao sincronizar com a nuvem.', 'info');
    }
  };

  // Opções de filtros (padrão CAVALO, sem aba Todos)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    search: '',
    type: 'cavalo',
    alertLevel: 'all',
    status: 'all',
    sortBy: 'urgency',
    sortDirection: 'asc',
  });

  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isChangeLogModalOpen, setIsChangeLogModalOpen] = useState(false);
  const [isManualMaintenanceOpen, setIsManualMaintenanceOpen] = useState(false);
  const [isEmailDispatchOpen, setIsEmailDispatchOpen] = useState(false);
  const [isSyncDailyModalOpen, setIsSyncDailyModalOpen] = useState(false);
  const [isManage8MonthsModalOpen, setIsManage8MonthsModalOpen] = useState(false);
  const [isAbastecimentoSyncModalOpen, setIsAbastecimentoSyncModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [meterVehicle, setMeterVehicle] = useState<Vehicle | null>(null);
  const [maintenanceVehicle, setMaintenanceVehicle] = useState<Vehicle | null>(null);

  // Mantém selectedVehicle sempre sincronizado com as revisões mais recentes da frota
  useEffect(() => {
    if (!selectedVehicle) return;
    const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const currentClean = clean(selectedVehicle.plate);
    const updated = vehicles.find(
      (v) => v.id === selectedVehicle.id || (clean(v.plate) === currentClean && v.type === selectedVehicle.type)
    );
    if (updated) {
      const isDifferent =
        updated.lastMaintenanceDate !== selectedVehicle.lastMaintenanceDate ||
        updated.lastMaintenanceMeter !== selectedVehicle.lastMaintenanceMeter ||
        updated.nextRevisionMeter !== selectedVehicle.nextRevisionMeter ||
        updated.currentMeter !== selectedVehicle.currentMeter;
      if (isDifferent) {
        setSelectedVehicle(updated);
      }
    }
  }, [vehicles, history, selectedVehicle]);

  // Modal do Catálogo Oficial de Revisões Scania Cotrasa (S, M, L, X)
  const [isRevisionCatalogOpen, setIsRevisionCatalogOpen] = useState(false);
  const [catalogInitialTab, setCatalogInitialTab] = useState<'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO'>('REVISAO S');

  const handleOpenRevisionCatalog = (tab: 'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO' = 'REVISAO S') => {
    setCatalogInitialTab(tab);
    setIsRevisionCatalogOpen(true);
  };

  // Intensidade do Fundo Martin Brower (Equilibrado / Nítido / Suave)
  const [bgIntensity, setBgIntensity] = useState<'balanced' | 'prominent' | 'subtle'>(() => {
    try {
      return (localStorage.getItem('fleet_bg_intensity') as 'balanced' | 'prominent' | 'subtle') || 'balanced';
    } catch {
      return 'balanced';
    }
  });

  const handleCycleBgIntensity = () => {
    setBgIntensity((prev) => {
      const next = prev === 'balanced' ? 'prominent' : prev === 'prominent' ? 'subtle' : 'balanced';
      try {
        localStorage.setItem('fleet_bg_intensity', next);
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Ações
  const handleBatchUpdateMeters = (
    updates: { plate: string; vehicleId?: string; vehicleType?: VehicleType; newMeter: number; note?: string }[]
  ) => {
    if (!updates || updates.length === 0) return;

    const updateById = new Map<string, { newMeter: number; note?: string }>();
    const updateByTypePlate = new Map<string, { newMeter: number; note?: string }>();
    const updateByCleanPlate = new Map<string, { newMeter: number; note?: string; vehicleType?: VehicleType }>();

    updates.forEach((u) => {
      if (u.vehicleId) {
        const existing = updateById.get(u.vehicleId);
        if (!existing || u.newMeter >= existing.newMeter) {
          updateById.set(u.vehicleId, u);
        }
      }
      const clean = u.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const typeKey = `${u.vehicleType || 'any'}_${clean}`;
      const existingType = updateByTypePlate.get(typeKey);
      if (!existingType || u.newMeter >= existingType.newMeter) {
        updateByTypePlate.set(typeKey, u);
      }
      const existingClean = updateByCleanPlate.get(clean);
      if (!existingClean || u.newMeter >= existingClean.newMeter) {
        updateByCleanPlate.set(clean, u);
      }
    });

    let updatedCount = 0;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const batchLogs: ChangeLogEntry[] = [];
    const modifiedVehicles: Vehicle[] = [];

    const nextVehicles = vehicles.map((v) => {
      const clean = v.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      // 1. Busca por ID direto
      let match = updateById.get(v.id);
      // 2. Busca por tipo e placa (ex: cavalo_BSZ5472 ou tk_EKH7453)
      if (!match) {
        match = updateByTypePlate.get(`${v.type}_${clean}`);
      }
      // 3. Fallback genérico se aplicável
      if (!match) {
        match = updateByTypePlate.get(`any_${clean}`);
      }
      // 4. Fallback por placa limpa direta
      if (!match) {
        const direct = updateByCleanPlate.get(clean);
        if (direct && (!direct.vehicleType || direct.vehicleType === v.type)) {
          match = direct;
        }
      }
      // 5. Se for Cavalo, busca também por vínculos ou frota
      if (!match && v.type === 'cavalo') {
        if (v.coupledTkPlate) {
          const cleanTk = v.coupledTkPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          match = updateByTypePlate.get(`cavalo_${cleanTk}`);
        }
        if (!match && v.fleetNumber) {
          const cleanFleet = v.fleetNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          match = updateByTypePlate.get(`cavalo_${cleanFleet}`) || updateByTypePlate.get(`any_${cleanFleet}`);
        }
      }
      // 6. Se for TK, busca também por vínculos (caminhão acoplado, TK_TO_TRUCK_MAPPING, fleetNumber)
      if (!match && v.type === 'tk') {
        const truckPlate = TK_TO_TRUCK_MAPPING[v.plate];
        if (truckPlate) {
          const cleanTruck = truckPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          match = updateByTypePlate.get(`tk_${cleanTruck}`) || updateByTypePlate.get(`any_${cleanTruck}`);
        }
        if (!match && v.coupledCarretaPlate) {
          const cleanCoupled = v.coupledCarretaPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          match = updateByTypePlate.get(`tk_${cleanCoupled}`) || updateByTypePlate.get(`any_${cleanCoupled}`);
        }
        if (!match && v.fleetNumber) {
          const cleanFleet = v.fleetNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          match = updateByTypePlate.get(`tk_${cleanFleet}`) || updateByTypePlate.get(`any_${cleanFleet}`);
        }
      }

      // 7. Se for Carreta, busca por placa, vínculos ou fleetNumber
      if (!match && v.type === 'carreta') {
        const cleanCarreta = v.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        match = updateByTypePlate.get(`carreta_${cleanCarreta}`) || updateByTypePlate.get(`any_${cleanCarreta}`);
        if (!match && v.coupledCarretaPlate) {
          const cleanCoupled = v.coupledCarretaPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          match = updateByTypePlate.get(`carreta_${cleanCoupled}`) || updateByTypePlate.get(`any_${cleanCoupled}`);
        }
        if (!match && v.fleetNumber) {
          const cleanFleet = v.fleetNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          match = updateByTypePlate.get(`carreta_${cleanFleet}`) || updateByTypePlate.get(`any_${cleanFleet}`);
        }
      }

      if (match) {
        // Validação rigorosa do valor recebido do lote (planilha/paste/gsheet)
        const validation = validateAndSanitizeMeter(match.newMeter, v, {
          isBatchSync: true,
          allowZeroForCarreta: true,
        });

        if (!validation.isValid) {
          console.warn(`[Batch Validation Guard] Atualização rejeitada para ${v.plate}: ${validation.error}`);
          return v;
        }

        updatedCount++;
        const sanitizedMeter = validation.sanitizedValue;

        // Cria registro de auditoria
        batchLogs.push({
          id: `log-batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: now.toISOString(),
          dateStr: now.toLocaleDateString('pt-BR'),
          timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          type: 'batch_sync',
          vehicleId: v.id,
          plate: v.plate,
          vehicleType: v.type,
          performedBy: 'Importação Planilha Diária (Portaria / Operação)',
          action: `Sincronização Diária: ${v.currentMeter.toLocaleString('pt-BR')} → ${sanitizedMeter.toLocaleString('pt-BR')} ${v.meterUnit}`,
          previousValue: v.currentMeter,
          newValue: sanitizedMeter,
          difference: sanitizedMeter - v.currentMeter,
          unit: v.meterUnit,
          notes: match.note || 'Atualizado via Planilha Diária de Horas/KM',
        });

        const updatedVehicle: Vehicle = {
          ...v,
          currentMeter: sanitizedMeter,
          kmSinceLastMaintenance: v.type === 'carreta' ? sanitizedMeter : v.kmSinceLastMaintenance,
          nextRevisionMeter: v.type === 'carreta' ? (v.carretaTaraKm || 60000) : v.nextRevisionMeter,
          observations: match.note
            ? `${v.observations ? v.observations + ' | ' : ''}${match.note}`
            : v.observations,
          updatedAt: today,
        };
        modifiedVehicles.push(updatedVehicle);
        return updatedVehicle;
      }
      return v;
    });

    setVehicles(nextVehicles);

    // Sincroniza imediatamente na nuvem para todos os usuários
    if (modifiedVehicles.length > 0) {
      saveMultipleVehiclesToCloud(modifiedVehicles).catch(console.error);
    }

    if (batchLogs.length > 0) {
      setChangeLogs((prev) => [...batchLogs, ...prev]);
      saveMultipleChangeLogsToCloud(batchLogs).catch(console.error);
    }

    showToast(`Planilha sincronizada! ${updatedCount} unidades atualizadas (Cavalos, Carretas e TKs sincronizados com sucesso).`);
  };

  const handleUpdateMeter = (
    vehicleId: string,
    newMeter: number,
    note?: string,
    performedBy?: string,
    readingDate?: string
  ) => {
    const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const targetClean = clean(vehicleId);

    const targetVehicle = vehicles.find(
      (v) =>
        v.id === vehicleId ||
        clean(v.plate) === targetClean ||
        clean(v.fleetNumber) === targetClean
    );

    if (targetVehicle) {
      const validation = validateAndSanitizeMeter(newMeter, targetVehicle, {
        isBatchSync: false,
        allowZeroForCarreta: true,
        allowRollback: true,
      });

      if (!validation.isValid) {
        showToast(`Erro de validação: ${validation.error}`, 'error');
        return;
      }
    }

    let sanitizedMeter = Math.round(newMeter);
    let updatedPlate = '';
    let updatedUnit: 'KM' | 'HORAS' = 'KM';
    let previousMeter = 0;
    let targetVehicleToSave: Vehicle | null = null;
    let vehicleType = 'cavalo' as VehicleType;

    // 1. Atualização do estado global com setter funcional e persistência síncrona
    setVehicles((prev) => {
      const nextVehicles = prev.map((v) => {
        const matches =
          v.id === vehicleId ||
          clean(v.plate) === targetClean ||
          clean(v.fleetNumber) === targetClean;

        if (matches) {
          updatedPlate = v.plate;
          updatedUnit = v.meterUnit;
          previousMeter = v.currentMeter;
          vehicleType = v.type;

          const validation = validateAndSanitizeMeter(newMeter, v, {
            isBatchSync: false,
            allowZeroForCarreta: true,
            allowRollback: true,
          });

          if (!validation.isValid) {
            return v;
          }

          sanitizedMeter = validation.sanitizedValue;

          const updated: Vehicle = {
            ...v,
            currentMeter: sanitizedMeter,
            kmSinceLastMaintenance: v.type === 'carreta' ? sanitizedMeter : v.kmSinceLastMaintenance,
            nextRevisionMeter: v.type === 'carreta' ? (v.carretaTaraKm || 60000) : v.nextRevisionMeter,
            observations: note ? `${v.observations ? v.observations + ' | ' : ''}${note}` : v.observations,
            updatedAt: readingDate || new Date().toISOString().split('T')[0],
          };
          targetVehicleToSave = updated;
          return updated;
        }
        return v;
      });

      try {
        localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(nextVehicles));
      } catch (e) {
        console.error('Erro ao persistir veículos no localStorage:', e);
      }

      return nextVehicles;
    });

    // 2. Registra no Log de Alterações e persiste
    const now = new Date();
    const responsibleName = performedBy?.trim() || (vehicleType === 'tk' ? 'Técnico Thermo King CDPR' : 'Mecânico / Operador CDPR');
    const logDateFormatted = readingDate ? readingDate.split('-').reverse().join('/') : now.toLocaleDateString('pt-BR');
    const logTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const diff = sanitizedMeter - previousMeter;

    const newLogEntry: ChangeLogEntry = {
      id: `log-meter-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      dateStr: logDateFormatted,
      timeStr: logTimeFormatted,
      type: 'meter_update',
      vehicleId,
      plate: updatedPlate || vehicleId,
      vehicleType,
      performedBy: responsibleName,
      action: `Atualização de ${updatedUnit}: ${previousMeter.toLocaleString('pt-BR')} → ${sanitizedMeter.toLocaleString('pt-BR')} ${updatedUnit}`,
      previousValue: previousMeter,
      newValue: sanitizedMeter,
      difference: diff,
      unit: updatedUnit,
      workshop: vehicleType === 'tk' ? 'VIDEFRIGO' : vehicleType === 'carreta' ? 'MOLA MUNDIAL' : 'SCANIA',
      notes: note || undefined,
    };

    setChangeLogs((prev) => {
      const nextLogs = [newLogEntry, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_CHANGELOGS, JSON.stringify(nextLogs));
      } catch (e) {
        console.error('Erro ao salvar changeLogs no localStorage:', e);
      }
      return nextLogs;
    });

    // 3. Propagação imediata para a nuvem Firestore
    if (targetVehicleToSave) {
      saveVehicleToCloud(targetVehicleToSave).catch((err) => {
        console.error('Erro ao sincronizar medição do veículo com o Firestore:', err);
      });
    }
    saveChangeLogToCloud(newLogEntry).catch(console.error);

    // 4. Atualiza também selectedVehicle caso o modal de detalhes esteja aberto
    setSelectedVehicle((prev) => {
      if (!prev) return null;
      if (
        prev.id === vehicleId ||
        clean(prev.plate) === targetClean ||
        clean(prev.fleetNumber) === targetClean
      ) {
        return {
          ...prev,
          currentMeter: sanitizedMeter,
          kmSinceLastMaintenance: prev.type === 'carreta' ? sanitizedMeter : prev.kmSinceLastMaintenance,
          observations: note ? `${prev.observations ? prev.observations + ' | ' : ''}${note}` : prev.observations,
          updatedAt: readingDate || new Date().toISOString().split('T')[0],
        };
      }
      return prev;
    });

    showToast(
      `Medição atualizada: ${sanitizedMeter.toLocaleString('pt-BR')} ${updatedUnit} para ${updatedPlate || vehicleId} por ${responsibleName}!`
    );
  };

  const handleSaveMaintenance = (record: MaintenanceRecord, updatedVehicle: Partial<Vehicle>) => {
    // 1. Histórico local com persistência imediata
    setHistory((prev) => {
      const nextHistory = [record, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextHistory));
      } catch (e) {
        console.error('Erro ao persistir histórico no localStorage:', e);
      }
      return nextHistory;
    });

    // 2. Log de Alterações para rastreabilidade
    const now = new Date();
    const logDateFormatted = record.date ? record.date.split('-').reverse().join('/') : now.toLocaleDateString('pt-BR');
    const logTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const technicianName = record.technician?.trim() || (record.workshop ? `Equipe ${record.workshop}` : 'Mecânico Responsável');

    const newLogEntry: ChangeLogEntry = {
      id: `log-maint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      dateStr: logDateFormatted,
      timeStr: logTimeFormatted,
      type: 'maintenance_performed',
      vehicleId: record.vehicleId,
      plate: record.plate,
      vehicleType: record.vehicleType,
      performedBy: technicianName,
      action: `Revisão Realizada: ${record.revisionType} aos ${record.meterReading.toLocaleString('pt-BR')} ${record.vehicleType === 'tk' ? 'HORAS' : 'KM'}`,
      previousValue: record.meterReading,
      newValue: record.nextScheduledMeter,
      difference: record.nextScheduledMeter - record.meterReading,
      unit: record.vehicleType === 'tk' ? 'HORAS' : 'KM',
      workshop: record.workshop,
      notes: record.notes || (record.partsReplaced?.length ? `Peças: ${record.partsReplaced.join(', ')}` : undefined),
    };

    setChangeLogs((prev) => {
      const nextLogs = [newLogEntry, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_CHANGELOGS, JSON.stringify(nextLogs));
      } catch (e) {
        console.error('Erro ao persistir changeLogs no localStorage:', e);
      }
      return nextLogs;
    });

    // 3. Atualiza o veículo no estado global e prepara objeto completo para o Firestore
    const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const recordPlateClean = clean(record.plate);

    let fullVehicleToSave: Vehicle | null = null;
    setVehicles((prev) => {
      const nextVehicles = prev.map((v) => {
        const matchesPlate = clean(v.plate) === recordPlateClean;
        const matchesType = !record.vehicleType || v.type === record.vehicleType;
        const matchesId = v.id === record.vehicleId;

        if (matchesId || (matchesPlate && matchesType)) {
          const full: Vehicle = {
            ...v,
            ...updatedVehicle,
            id: v.id,
            plate: v.plate,
            type: v.type,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          fullVehicleToSave = full;
          return full;
        }
        return v;
      });

      try {
        localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(nextVehicles));
      } catch (e) {
        console.error('Erro ao persistir veículos no localStorage:', e);
      }

      return nextVehicles;
    });

    // 4. Sincronização atômica na nuvem Firestore (refletida para todos os usuários)
    const vehiclePayload = fullVehicleToSave || {
      id: record.vehicleId,
      plate: record.plate,
      type: record.vehicleType,
      ...updatedVehicle,
    };

    saveMaintenanceRecordToCloud(record, vehiclePayload).catch((err) => {
      console.error('Erro ao sincronizar manutenção com o Firestore:', err);
    });
    saveChangeLogToCloud(newLogEntry).catch(console.error);

    // 5. Se a janela de detalhes estiver aberta para o mesmo veículo, atualiza imediatamente
    setSelectedVehicle((prev) => {
      if (!prev) return null;
      const matchesPlate = clean(prev.plate) === recordPlateClean;
      const matchesType = !record.vehicleType || prev.type === record.vehicleType;
      const matchesId = prev.id === record.vehicleId;
      if (matchesId || (matchesPlate && matchesType)) {
        return {
          ...prev,
          ...updatedVehicle,
          id: prev.id,
          plate: prev.plate,
          type: prev.type,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return prev;
    });

    showToast(`Revisão '${record.revisionType}' registrada com sucesso para ${record.plate}!`);
  };

  const handleAddVehicle = (newVehicle: Vehicle) => {
    setVehicles((prev) => [newVehicle, ...prev]);
    saveVehicleToCloud(newVehicle).catch(console.error);
    showToast(`Unidade ${newVehicle.plate} (${newVehicle.fleetNumber}) cadastrada com sucesso!`);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    deleteVehicleFromCloud(vehicleId).catch(console.error);
    showToast('Veículo removido da frota.', 'info');
  };

  const handleDeleteHistoryRecord = (recordId: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== recordId));
    deleteHistoryRecordFromCloud(recordId).catch(console.error);
    showToast('Registro de revisão excluído com sucesso do histórico.', 'info');
  };

  const handleClearCavaloHistory = () => {
    setHistory((prev) => {
      const filtered = prev.filter((r) => r.vehicleType !== 'cavalo');
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      return filtered;
    });
    clearHistoryByTypeFromCloud('cavalo').catch(console.error);
    showToast('Todos os históricos de manutenção de Cavalos foram excluídos!', 'info');
  };

  const handleClearCarretaHistory = () => {
    setHistory((prev) => {
      const filtered = prev.filter((r) => r.vehicleType !== 'carreta');
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      return filtered;
    });
    clearHistoryByTypeFromCloud('carreta').catch(console.error);
    showToast('Histórico de manutenção de Carretas limpo com sucesso!', 'info');
  };

  const handleClearTkHistory = () => {
    setHistory((prev) => {
      const filtered = prev.filter((r) => r.vehicleType !== 'tk');
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      return filtered;
    });
    clearHistoryByTypeFromCloud('tk').catch(console.error);
    showToast('Histórico de manutenção de TKs limpo com sucesso!', 'info');
  };

  const handleRestoreCarretaHistory = () => {
    const nonCarreta = history.filter((r) => r.vehicleType !== 'carreta');
    const combined = [...CARRETA_REVISIONS_HISTORY, ...nonCarreta];
    setHistory(combined);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(combined));
    } catch (e) {
      console.error(e);
    }
    saveMultipleHistoryRecordsToCloud(CARRETA_REVISIONS_HISTORY).catch(console.error);
    showToast('Histórico oficial de 139 revisões de Carretas restaurado com sucesso!', 'success');
  };

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const targetClean = clean(updatedVehicle.plate);

    let fullUpdated: Vehicle = updatedVehicle;

    setVehicles((prev) => {
      const next = prev.map((v) => {
        if (v.id === updatedVehicle.id || clean(v.plate) === targetClean) {
          fullUpdated = {
            ...v,
            ...updatedVehicle,
            id: v.id,
            plate: v.plate,
            type: v.type,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          return fullUpdated;
        }
        return v;
      });

      try {
        localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(next));
      } catch (e) {
        console.error('Erro ao persistir veículos no localStorage:', e);
      }
      return next;
    });

    if (selectedVehicle && (selectedVehicle.id === updatedVehicle.id || clean(selectedVehicle.plate) === targetClean)) {
      setSelectedVehicle(fullUpdated);
    }

    saveVehicleToCloud(fullUpdated).catch((err) => {
      console.error('Erro ao sincronizar atualização de veículo com o Firestore:', err);
    });
    showToast(`Dados da revisão de ${updatedVehicle.plate} atualizados com sucesso!`, 'success');
  };

  const handleUpdateHistoryRecord = (updatedRecord: MaintenanceRecord) => {
    const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const recordPlateClean = clean(updatedRecord.plate);

    setHistory((prev) => {
      const nextHistory = prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextHistory));
      } catch (e) {
        console.error('Erro ao persistir histórico no localStorage:', e);
      }
      return nextHistory;
    });

    saveMaintenanceRecordToCloud(updatedRecord).catch((err) => {
      console.error('Erro ao salvar registro de histórico na nuvem:', err);
    });

    // Se o registro editado for a última manutenção do veículo, sincroniza os dados do veículo também
    setVehicles((prev) => {
      let vehicleToSync: Vehicle | null = null;
      const nextVehicles = prev.map((v) => {
        const matchesPlate = clean(v.plate) === recordPlateClean;
        const matchesType = !updatedRecord.vehicleType || v.type === updatedRecord.vehicleType;
        const matchesId = v.id === updatedRecord.vehicleId;
        if (matchesId || (matchesPlate && matchesType)) {
          const isLatestOrCurrent =
            v.lastMaintenanceMeter === updatedRecord.meterReading ||
            v.lastMaintenanceType === updatedRecord.revisionType ||
            !v.lastMaintenanceDate ||
            v.lastMaintenanceDate === updatedRecord.date;

          if (isLatestOrCurrent) {
            const isTime = v.isTimeBasedRevision;
            const nextRevDate = isTime && updatedRecord.date ? addMonthsToDate(updatedRecord.date, 8) : v.nextRevisionDate;
            const updatedV: Vehicle = {
              ...v,
              lastMaintenanceDate: updatedRecord.date,
              lastMaintenanceMeter: updatedRecord.meterReading,
              lastMaintenanceType: updatedRecord.revisionType as any,
              nextRevisionMeter: updatedRecord.nextScheduledMeter || v.nextRevisionMeter,
              nextRevisionDate: nextRevDate,
              updatedAt: new Date().toISOString(),
            };
            vehicleToSync = updatedV;
            return updatedV;
          }
        }
        return v;
      });

      try {
        localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(nextVehicles));
      } catch (e) {
        console.error('Erro ao persistir veículos no localStorage:', e);
      }

      if (vehicleToSync) {
        saveVehicleToCloud(vehicleToSync).catch(console.error);
        if (selectedVehicle && (clean(selectedVehicle.plate) === recordPlateClean || selectedVehicle.id === updatedRecord.vehicleId)) {
          setSelectedVehicle(vehicleToSync);
        }
      }
      return nextVehicles;
    });

    showToast(`Registro de manutenção da placa ${updatedRecord.plate} atualizado com sucesso!`);
  };

  const handleToggleVehicleTimeBased = (plate: string, enable?: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    let newStatus = false;
    let targetPlate = plate;
    let targetVehicleToSave: Vehicle | null = null;
    const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const targetClean = clean(plate);

    setVehicles((prev) => {
      const nextVehicles = prev.map((v) => {
        if (clean(v.plate) === targetClean || v.id === plate) {
          targetPlate = v.plate;
          const currentIsTime = isVehicleTimeBased(v);
          newStatus = typeof enable === 'boolean' ? enable : !currentIsTime;

          let nextDate = v.nextRevisionDate;
          if (newStatus && !nextDate) {
            nextDate = addMonthsToDate(v.lastMaintenanceDate || today, 8);
          }

          const res: Vehicle = {
            ...v,
            isTimeBasedRevision: newStatus,
            timeBasedIntervalMonths: newStatus ? 8 : undefined,
            nextRevisionDate: nextDate,
            updatedAt: today,
          };
          targetVehicleToSave = res;
          return res;
        }
        return v;
      });

      try {
        localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(nextVehicles));
      } catch (e) {
        console.error('Erro ao persistir veículos no localStorage:', e);
      }

      return nextVehicles;
    });

    if (targetVehicleToSave) {
      saveVehicleToCloud(targetVehicleToSave).catch(console.error);
    }

    if (selectedVehicle && (clean(selectedVehicle.plate) === targetClean || selectedVehicle.id === plate)) {
      setSelectedVehicle((prev) => {
        if (!prev) return null;
        const currentIsTime = isVehicleTimeBased(prev);
        const resolvedStatus = typeof enable === 'boolean' ? enable : !currentIsTime;
        return {
          ...prev,
          isTimeBasedRevision: resolvedStatus,
          timeBasedIntervalMonths: resolvedStatus ? 8 : undefined,
          nextRevisionDate: resolvedStatus && !prev.nextRevisionDate ? addMonthsToDate(prev.lastMaintenanceDate || today, 8) : prev.nextRevisionDate,
          updatedAt: today,
        };
      });
    }

    const now = new Date();
    const logDateFormatted = now.toLocaleDateString('pt-BR');
    const logTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newLogEntry: ChangeLogEntry = {
      id: `log-8m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      dateStr: logDateFormatted,
      timeStr: logTimeFormatted,
      type: 'maintenance_performed',
      plate: targetPlate,
      vehicleType: 'cavalo',
      performedBy: 'Gestão Operacional de Frota',
      action: newStatus
        ? `Regra de 8 Meses APLICADA para ${targetPlate} (Vencimento programado por Data na Scania)`
        : `Regra de 8 Meses DESMARCADA para ${targetPlate} (Retornou para monitoramento padrão de KM • Trava 40k)`,
      workshop: 'SCANIA',
      notes: newStatus ? 'Ativado diretamente sem precisar cadastrar nova placa' : 'Desmarcado diretamente sem precisar cadastrar nova placa',
    };

    setChangeLogs((prev) => [newLogEntry, ...prev]);
    saveChangeLogToCloud(newLogEntry).catch(console.error);

    showToast(
      newStatus
        ? `⏱️ Regra de 8 Meses APLICADA para ${targetPlate}! Vencimento agora monitorado por data.`
        : `✅ Regra de 8 Meses DESMARCADA para ${targetPlate}! Retornou ao monitoramento por KM (Trava 40k).`
    );
  };

  const handleResetTimeBasedToDefault = () => {
    const today = new Date().toISOString().split('T')[0];
    const modifiedList: Vehicle[] = [];
    const nextVehicles = vehicles.map((v) => {
      if (v.type === 'cavalo') {
        const isOfficial = TIME_BASED_CAVALO_PLATES.includes(v.plate);
        const updated: Vehicle = {
          ...v,
          isTimeBasedRevision: isOfficial,
          timeBasedIntervalMonths: isOfficial ? 8 : undefined,
          nextRevisionDate: isOfficial ? (v.nextRevisionDate || addMonthsToDate(v.lastMaintenanceDate || today, 8)) : v.nextRevisionDate,
          updatedAt: today,
        };
        modifiedList.push(updated);
        return updated;
      }
      return v;
    });

    setVehicles(nextVehicles);

    if (modifiedList.length > 0) {
      saveMultipleVehiclesToCloud(modifiedList).catch(console.error);
    }
    showToast('Lista de 10 Cavalos com regra temporal de 8 Meses restaurada ao padrão oficial!', 'info');
  };

  const handleUpdateCavaloTaraKm = (plateOrAll: string | 'ALL', newTaraKm: number) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const logDateFormatted = now.toLocaleDateString('pt-BR');
    const logTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const sanitizedTara = Math.max(5000, Math.round(newTaraKm));

    let updatedCount = 0;
    const modifiedVehicles: Vehicle[] = [];

    const nextVehicles = vehicles.map((v) => {
      if (v.type === 'cavalo') {
        if (plateOrAll === 'ALL' || v.plate === plateOrAll || v.id === plateOrAll) {
          updatedCount++;
          const lastType = (v.lastMaintenanceType || '').toUpperCase();
          const lastMeter = v.lastMaintenanceMeter || 0;
          const alertKm = Math.round(sanitizedTara / 2);
          let nextMeter = v.nextRevisionMeter;

          // Recalcula a meta programada do medidor de acordo com o ciclo
          if (lastType.includes('REVISAO L') || lastType.includes('REVISÃO L')) {
            nextMeter = lastMeter + sanitizedTara;
          } else if (lastType.includes('REVISAO S') || lastType.includes('REVISÃO S') || lastType.includes('REVISAO M') || lastType.includes('REVISÃO M')) {
            nextMeter = lastMeter + alertKm;
          } else if (lastType.includes('REVISAO X') || lastType.includes('REVISÃO X')) {
            nextMeter = lastMeter + alertKm;
          } else {
            nextMeter = lastMeter + alertKm;
          }

          const modified: Vehicle = {
            ...v,
            cavaloTaraKm: sanitizedTara,
            nextRevisionMeter: nextMeter,
            updatedAt: today,
          };
          modifiedVehicles.push(modified);
          return modified;
        }
      }
      return v;
    });

    setVehicles(nextVehicles);

    // Sincronização automática na nuvem com Firestore para todos os usuários
    if (modifiedVehicles.length > 0) {
      if (plateOrAll === 'ALL') {
        saveMultipleVehiclesToCloud(modifiedVehicles).catch(console.error);
      } else {
        const single = modifiedVehicles.find((v) => v.plate === plateOrAll || v.id === plateOrAll);
        if (single) saveVehicleToCloud(single).catch(console.error);
      }
    }

    if (selectedVehicle && selectedVehicle.type === 'cavalo' && (plateOrAll === 'ALL' || selectedVehicle.plate === plateOrAll || selectedVehicle.id === plateOrAll)) {
      setSelectedVehicle((prev) => {
        if (!prev) return null;
        const lastType = (prev.lastMaintenanceType || '').toUpperCase();
        const lastMeter = prev.lastMaintenanceMeter || 0;
        const alertKm = Math.round(sanitizedTara / 2);
        let nextMeter = prev.nextRevisionMeter;
        if (lastType.includes('REVISAO L') || lastType.includes('REVISÃO L')) {
          nextMeter = lastMeter + sanitizedTara;
        } else {
          nextMeter = lastMeter + alertKm;
        }
        return {
          ...prev,
          cavaloTaraKm: sanitizedTara,
          nextRevisionMeter: nextMeter,
          updatedAt: today,
        };
      });
    }

    const actionText =
      plateOrAll === 'ALL'
        ? `Trava de KM alterada para ${sanitizedTara.toLocaleString('pt-BR')} KM para TODOS os Cavalos Mecânicos (38 unidades) • Alerta Intermediário aos ${Math.round(sanitizedTara / 2).toLocaleString('pt-BR')} KM`
        : `Trava de KM alterada para ${sanitizedTara.toLocaleString('pt-BR')} KM para o cavalo ${plateOrAll} • Alerta Intermediário aos ${Math.round(sanitizedTara / 2).toLocaleString('pt-BR')} KM`;

    const newTaraLog: ChangeLogEntry = {
      id: `log-tara-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      dateStr: logDateFormatted,
      timeStr: logTimeFormatted,
      type: 'maintenance_performed',
      plate: plateOrAll === 'ALL' ? 'FROTA CAVALOS' : plateOrAll,
      vehicleType: 'cavalo',
      performedBy: 'Gestão Operacional de Frota',
      action: actionText,
      workshop: 'SCANIA',
      notes: `Ajuste imediato de limite operacional de ciclo para ${sanitizedTara.toLocaleString('pt-BR')} KM`,
    };

    setChangeLogs((prev) => [newTaraLog, ...prev]);
    saveChangeLogToCloud(newTaraLog).catch(console.error);

    showToast(
      plateOrAll === 'ALL'
        ? `⚡ Trava de ${sanitizedTara.toLocaleString('pt-BR')} KM aplicada com sucesso para TODOS os ${updatedCount || 38} cavalos!`
        : `✅ Trava de ${sanitizedTara.toLocaleString('pt-BR')} KM aplicada para ${plateOrAll}!`
    );
  };

  const handleResetDemoData = () => {
    if (confirm('Deseja recarregar a lista oficial de placas da frota (38 Cavalos incluindo TCK-6F83, TCK-6F97 e EGY-1481, 28 Carretas e 38 TKs)?')) {
      setVehicles(INITIAL_VEHICLES);
      setHistory(INITIAL_MAINTENANCE_HISTORY);
      localStorage.removeItem(STORAGE_KEY_VEHICLES);
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      saveMultipleVehiclesToCloud(INITIAL_VEHICLES).catch(console.error);
      saveMultipleHistoryRecordsToCloud(INITIAL_MAINTENANCE_HISTORY).catch(console.error);
      showToast('Lista oficial de placas recarregada com sucesso!');
    }
  };

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col font-sans relative selection:bg-amber-500 selection:text-slate-950 bg-[#070b14] overflow-x-hidden ${
        bgIntensity === 'prominent'
          ? 'bg-intensity-prominent'
          : bgIntensity === 'subtle'
          ? 'bg-intensity-subtle'
          : ''
      }`}
    >
      {/* Camadas de Fundo Martin Brower (desfocado e esmaecido) */}
      <div className="mb-bg-layer" aria-hidden="true" />
      <div className="mb-bg-overlay" aria-hidden="true" />
      <div className="mb-bg-grid" aria-hidden="true" />

      {/* Top Header */}
      <Header
        vehicles={vehicles}
        history={history}
        changeLogsCount={changeLogs.length}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenChangeLog={() => setIsChangeLogModalOpen(true)}
        onOpenManualMaintenance={() => setIsManualMaintenanceOpen(true)}
        onResetDemoData={handleResetDemoData}
        onOpenEmailDispatch={() => setIsEmailDispatchOpen(true)}
        onOpenSyncDailySheet={() => setIsSyncDailyModalOpen(true)}
        onOpenAbastecimentoSync={() => setIsAbastecimentoSyncModalOpen(true)}
        onOpenRevisionCatalog={handleOpenRevisionCatalog}
        onOpenManage8Months={() => setIsManage8MonthsModalOpen(true)}
        syncStatus={syncStatus}
        onForceCloudRefresh={handleForceCloudRefresh}
        bgIntensity={bgIntensity}
        onCycleBgIntensity={handleCycleBgIntensity}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">
        {activeView === 'forecast' ? (
          <MaintenanceForecastDashboard
            vehicles={vehicles}
            history={history}
            onSelectVehicle={(v) => setSelectedVehicle(v)}
            onOpenRegisterMaintenance={(v) => setMaintenanceVehicle(v)}
            onOpenSyncDailySheet={() => setIsSyncDailyModalOpen(true)}
            onOpenRevisionCatalog={handleOpenRevisionCatalog}
          />
        ) : (
          <>
            {/* Banner de Alerta Crítico / Vencidas */}
            <AlertBanner
              vehicles={vehicles}
              onSelectVehicle={(v) => setSelectedVehicle(v)}
              onOpenRegisterMaintenance={(v) => setMaintenanceVehicle(v)}
              onFilterCritical={() =>
                setFilterOptions((prev) => ({ ...prev, alertLevel: 'critical', type: 'cavalo' }))
              }
            />

            {/* Painel de Indicadores e Estatísticas */}
            <DashboardStats
              vehicles={vehicles}
              activeType={filterOptions.type}
              activeAlertLevel={filterOptions.alertLevel}
              onFilterType={(type: 'all' | VehicleType) =>
                setFilterOptions((prev) => ({ ...prev, type: type === 'all' ? 'cavalo' : type }))
              }
              onFilterAlert={(alertLevel: 'all' | AlertLevel) =>
                setFilterOptions((prev) => ({ ...prev, alertLevel }))
              }
            />

            {/* Lista e Tabela de Frotas */}
            <FleetList
              vehicles={vehicles}
              filterOptions={filterOptions}
              setFilterOptions={setFilterOptions}
              onOpenUpdateMeter={(v) => setMeterVehicle(v)}
              onOpenRegisterMaintenance={(v) => setMaintenanceVehicle(v)}
              onOpenManualMaintenance={() => setIsManualMaintenanceOpen(true)}
              onSelectVehicle={(v) => setSelectedVehicle(v)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenEmailDispatch={() => setIsEmailDispatchOpen(true)}
              onOpenSyncDailySheet={() => setIsSyncDailyModalOpen(true)}
              onOpenChangeLog={() => setIsChangeLogModalOpen(true)}
              onOpenRevisionCatalog={handleOpenRevisionCatalog}
              onDeleteVehicle={handleDeleteVehicle}
              onClearTkHistory={handleClearTkHistory}
              onClearCarretaHistory={handleClearCarretaHistory}
              onToggleVehicleTimeBased={handleToggleVehicleTimeBased}
              onResetTimeBasedToDefault={handleResetTimeBasedToDefault}
              onUpdateCavaloTaraKm={handleUpdateCavaloTaraKm}
            />
          </>
        )}
      </main>

      {/* Footer Operacional */}
      <footer className="bg-slate-950/80 backdrop-blur-sm border-t border-slate-800/80 py-4 text-center text-xs text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sistema de Gestão de Manutenção Preventiva • Parâmetros: Cavalos (X, S, L, M • Vencimento 8 Meses por Data) | Carretas (Trava 30.000 KM / 50.000 KM • Reset 0 KM) | TK (Filtro 500h / 1.000h / 1.500h)
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChangeLogModalOpen(true)}
              className="text-amber-400 hover:underline cursor-pointer font-medium"
            >
              Log de Alterações ({changeLogs.length})
            </button>
            <span>•</span>
            <button
              onClick={() => setIsEmailDispatchOpen(true)}
              className="text-sky-400 hover:underline cursor-pointer font-medium"
            >
              Disparar por E-mail
            </button>
            <span>•</span>
            <button
              onClick={() => exportFleetToExcel(vehicles, history)}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Exportar XLSX
            </button>
            <span>•</span>
            <button
              onClick={() => exportFleetToPdf(vehicles, history)}
              className="text-rose-400 hover:underline cursor-pointer"
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </footer>

      {/* Modais Interativos */}
      {meterVehicle && (
        <UpdateMeterModal
          vehicle={meterVehicle}
          onClose={() => setMeterVehicle(null)}
          onSave={handleUpdateMeter}
        />
      )}

      {(Boolean(maintenanceVehicle) || isManualMaintenanceOpen) && (
        <RegisterMaintenanceModal
          vehicle={maintenanceVehicle}
          vehicles={vehicles}
          isOpen={true}
          onClose={() => {
            setMaintenanceVehicle(null);
            setIsManualMaintenanceOpen(false);
          }}
          onSaveMaintenance={handleSaveMaintenance}
        />
      )}

      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          history={history}
          allVehicles={vehicles}
          changeLogs={changeLogs}
          onClose={() => setSelectedVehicle(null)}
          onOpenUpdateMeter={(v) => setMeterVehicle(v)}
          onOpenRegisterMaintenance={(v) => setMaintenanceVehicle(v)}
          onDeleteVehicle={handleDeleteVehicle}
          onDeleteHistoryRecord={handleDeleteHistoryRecord}
          onUpdateHistoryRecord={handleUpdateHistoryRecord}
          onUpdateVehicle={handleUpdateVehicle}
          onClearTkHistory={handleClearTkHistory}
          onOpenRevisionCatalog={handleOpenRevisionCatalog}
          onToggleTimeBased={handleToggleVehicleTimeBased}
          onUpdateCavaloTaraKm={handleUpdateCavaloTaraKm}
        />
      )}

      {isChangeLogModalOpen && (
        <ChangeLogModal
          isOpen={isChangeLogModalOpen}
          onClose={() => setIsChangeLogModalOpen(false)}
          logs={changeLogs}
          onClearLogs={() => setChangeLogs([])}
        />
      )}

      {isAddModalOpen && (
        <AddVehicleModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddVehicle={handleAddVehicle}
          existingCarretas={vehicles.filter((v) => v.type === 'carreta')}
          existingTks={vehicles.filter((v) => v.type === 'tk')}
        />
      )}

      {isHistoryModalOpen && (
        <GlobalHistoryModal
          isOpen={isHistoryModalOpen}
          history={history}
          onClose={() => setIsHistoryModalOpen(false)}
          onExportExcel={() => exportFleetToExcel(vehicles, history)}
          onExportPdf={() => exportFleetToPdf(vehicles, history)}
          onOpenChangeLog={() => setIsChangeLogModalOpen(true)}
          onDeleteHistoryRecord={handleDeleteHistoryRecord}
          onUpdateHistoryRecord={handleUpdateHistoryRecord}
          onClearCavaloHistory={handleClearCavaloHistory}
          onClearCarretaHistory={handleClearCarretaHistory}
          onClearTkHistory={handleClearTkHistory}
          onRestoreCarretaHistory={handleRestoreCarretaHistory}
          onOpenManualMaintenance={() => setIsManualMaintenanceOpen(true)}
        />
      )}

      {isEmailDispatchOpen && (
        <EmailDispatchModal
          isOpen={isEmailDispatchOpen}
          onClose={() => setIsEmailDispatchOpen(false)}
          vehicles={vehicles}
          history={history}
          onNotify={(msg, type) => showToast(msg, type)}
        />
      )}

      {isSyncDailyModalOpen && (
        <DailyHoursSyncModal
          isOpen={isSyncDailyModalOpen}
          onClose={() => setIsSyncDailyModalOpen(false)}
          vehicles={vehicles}
          onBatchUpdateMeters={handleBatchUpdateMeters}
        />
      )}

      {/* Catálogo Oficial de Revisões Scania Cotrasa (S, M, L, X) */}
      <ScaniaRevisionCatalogModal
        isOpen={isRevisionCatalogOpen}
        onClose={() => setIsRevisionCatalogOpen(false)}
        initialRevisionType={catalogInitialTab}
      />

      {/* Modal Gerenciar 8 Meses & Trava de KM */}
      {isManage8MonthsModalOpen && (
        <Manage8MonthsModal
          isOpen={isManage8MonthsModalOpen}
          onClose={() => setIsManage8MonthsModalOpen(false)}
          vehicles={vehicles}
          onToggleTimeBased={handleToggleVehicleTimeBased}
          onResetToDefault={handleResetTimeBasedToDefault}
          onUpdateCavaloTaraKm={handleUpdateCavaloTaraKm}
        />
      )}

      {/* Modal Integração com App de Abastecimento (Webhook e Tempo Real) */}
      <AbastecimentoSyncModal
        isOpen={isAbastecimentoSyncModalOpen}
        onClose={() => setIsAbastecimentoSyncModalOpen(false)}
        vehicles={vehicles}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2 bg-slate-900 border text-white px-4 py-2.5 rounded-xl shadow-2xl ${
              toastMessage.type === 'error'
                ? 'border-rose-500/70 text-rose-200'
                : toastMessage.type === 'info'
                ? 'border-sky-500/50 text-sky-200'
                : 'border-emerald-500/50 text-white'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-medium">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

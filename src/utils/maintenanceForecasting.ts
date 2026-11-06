import { Vehicle, VehicleType, MaintenanceRecord } from '../types';
import {
  TIME_BASED_CAVALO_PLATES,
  isTimeBasedCavalo,
  isVehicleTimeBased,
  isTkFilter500hPlate,
  isTkFilter1000hPlate,
  isCarreta50k,
  addMonthsToDate,
} from './maintenanceCalculations';
import { getTkSpecByPlate } from '../data/tkSpecs';
import { TK_TO_TRUCK_MAPPING, TRUCK_TO_TK_MAPPING } from '../data/initialData';

export interface RevisionCostInfo {
  laborCost: number; // Mão de obra (R$)
  totalCost: number; // Total (R$)
  partsCost: number; // Peças / Insumos (R$)
  description: string;
}

// ==========================================
// TABELA OFICIAL DE PREÇOS FORNECIDA PELO USUÁRIO
// ==========================================

// MÃO DE OBRA REVISÃO CVM (SCANIA) / TOTAL
export const CAVALO_REVISION_COSTS: Record<string, RevisionCostInfo> = {
  'REVISAO L': {
    laborCost: 2831.82,
    totalCost: 9473.89,
    partsCost: 9473.89 - 2831.82, // R$ 6.642,07
    description: 'Revisão L Scania (Grande Porte: Transmissão, Diferencial, Filtros Completos e Freios)',
  },
  'REVISAO M': {
    laborCost: 849.55,
    totalCost: 4247.16,
    partsCost: 4247.16 - 849.55, // R$ 3.397,61
    description: 'Revisão M Scania (Intermediária: Óleo de Motor, Filtros Secadores e Valvulação)',
  },
  'REVISAO S': {
    laborCost: 707.96,
    totalCost: 3449.87,
    partsCost: 3449.87 - 707.96, // R$ 2.741,91
    description: 'Revisão S Scania (Periódica Standard: Óleo do Motor e Filtros Primários)',
  },
  'REVISAO X': {
    laborCost: 283.18,
    totalCost: 1134.97,
    partsCost: 1134.97 - 283.18, // R$ 851,79
    description: 'Revisão X Scania (Básica: Lubrificação, Checklist Eletrônico e Filtro de Combustível)',
  },
};

// VALORES TKFRIOS (THERMO KING)
export const TK_REVISION_COSTS: Record<string, RevisionCostInfo> = {
  '500H': {
    laborCost: 450.00,
    totalCost: 1150.00, // M.O. R$ 450,00 + ~R$ 700,00 filtros de óleo, combustível e ar
    partsCost: 700.00,
    description: 'Troca de Filtros TK 500H (M.O. R$ 450,00 + Kit de Filtros de Óleo, Combustível e Ar)',
  },
  '1500H': {
    laborCost: 2192.00,
    totalCost: 3392.00, // M.O. R$ 2.192,00 + ~R$ 1.200,00 peças/filtros/óleo sintético
    partsCost: 1200.00,
    description: 'Preventiva TK 1.500H (M.O. R$ 2.192,00: Óleo, Filtros, Correias e Inspeção de Refrigeração)',
  },
  '2100H': {
    laborCost: 240.00,
    totalCost: 590.00, // M.O. R$ 240,00 + ~R$ 350,00 complementos
    partsCost: 350.00,
    description: 'Revisão Intermediária TK 2.100H (M.O. R$ 240,00: Ajustes, Tensão de Correias e Calibração)',
  },
};

// REVISÃO CARRETA (RODANTES / MÃO DE OBRA)
export const CARRETA_REVISION_COSTS: Record<string, RevisionCostInfo> = {
  '3 EIXOS': {
    laborCost: 1073.00,
    totalCost: 2573.00, // M.O. R$ 1.073,00 + ~R$ 1.500,00 (lonas de freio Master, retentores e rolamentos)
    partsCost: 1500.00,
    description: 'Revisão Rodantes 3 Eixos (M.O. R$ 1.073,00: Freios, Cubos, Rolamentos e Suspensão)',
  },
  '2 EIXOS': {
    laborCost: 878.50,
    totalCost: 1878.50, // M.O. R$ 878,50 + ~R$ 1.000,00
    partsCost: 1000.00,
    description: 'Revisão Rodantes 2 Eixos (M.O. R$ 878,50: Freios, Cubos e Mancais)',
  },
};

export interface ForecastItem {
  id: string;
  vehicleId: string;
  plate: string;
  fleetNumber: string;
  type: VehicleType;
  revisionType: string;
  serviceCategory: string; // Ex: "Revisão CVM Scania", "TKFrios 1500H", "Rodantes 3 Eixos"
  
  // Temporal
  projectedDate: string; // YYYY-MM-DD
  projectedMonthKey: string; // YYYY-MM
  projectedMonthLabel: string; // Ex: "Janeiro/2027"
  isOverdueOrCurrent: boolean;
  isRolledOver?: boolean; // Verdadeiro quando a revisão era de mês anterior não realizada e foi reprogramada
  rolledOverFromMonth?: string; // Mês original da programação (ex: "Setembro/2026")
  isAttentionOnly?: boolean; // Atenção (ex: filtro 500h/1000h) antes da trava final de 1.500h
  
  // Métricas
  currentMeter: number;
  projectedMeter: number;
  remainingMeter: number;
  meterUnit: 'KM' | 'HORAS';
  
  // Custos
  laborCost: number;
  partsCost: number;
  totalCost: number;
  
  // Detalhes
  isTimeBased?: boolean;
  bodySize?: string;
  axlesConfig?: string;
  explanation: string;
}

export interface MonthForecastGroup {
  monthKey: string; // YYYY-MM
  monthLabel: string; // Ex: "Janeiro/2027"
  year: number;
  monthIndex: number; // 0-11
  
  totalVehicles: number;
  cavaloCount: number;
  carretaCount: number;
  tkCount: number;
  
  totalLaborCost: number;
  totalPartsCost: number;
  totalCost: number;
  
  cavaloCost: number;
  carretaCost: number;
  tkCost: number;
  
  items: ForecastItem[];
}

export const DEFAULT_MONTHLY_KM_CAVALO = 4530;
export const DEFAULT_MONTHLY_KM_CARRETA = 5755;
export const DEFAULT_MONTHLY_HOURS_TK = 133;

export const PREMISSAS_STORAGE_KEY = 'mb_fleet_premissas_config';

export interface StoredPremissas {
  monthlyKmCavalo: number;
  monthlyKmCarreta: number;
  monthlyHoursTk: number;
}

export function getStoredPremissas(): StoredPremissas {
  try {
    const raw = localStorage.getItem(PREMISSAS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        monthlyKmCavalo: Number(parsed.monthlyKmCavalo) > 0 ? Number(parsed.monthlyKmCavalo) : DEFAULT_MONTHLY_KM_CAVALO,
        monthlyKmCarreta: Number(parsed.monthlyKmCarreta) > 0 ? Number(parsed.monthlyKmCarreta) : DEFAULT_MONTHLY_KM_CARRETA,
        monthlyHoursTk: Number(parsed.monthlyHoursTk) > 0 ? Number(parsed.monthlyHoursTk) : DEFAULT_MONTHLY_HOURS_TK,
      };
    }
  } catch {
    // Falha silenciosa no parsing, usa padrão
  }
  return {
    monthlyKmCavalo: DEFAULT_MONTHLY_KM_CAVALO,
    monthlyKmCarreta: DEFAULT_MONTHLY_KM_CARRETA,
    monthlyHoursTk: DEFAULT_MONTHLY_HOURS_TK,
  };
}

export function saveStoredPremissas(data: StoredPremissas): void {
  try {
    localStorage.setItem(PREMISSAS_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar premissas operacionais no localStorage:', err);
  }
}

export interface ForecastOptions {
  monthlyKmCavalo?: number; // Padrão: 4.530 KM/mês
  monthlyKmCarreta?: number; // Padrão: 5.755 KM/mês
  monthlyHoursTk?: number; // Padrão: 133 Horas/mês
  horizonMonths?: number; // Padrão: 15 meses
  baseDate?: Date; // Data base para projeção dinâmica
  history?: MaintenanceRecord[]; // Histórico para reconciliação automática
}

/**
 * Converte qualquer formato de data (DD/MM/YYYY, ISO, timestamp) em score numérico para ordenação correta.
 */
export function parseDateScore(d?: string): number {
  if (!d) return 0;
  const str = String(d).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
  }
  const t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Infere o tipo do veículo do registro de histórico caso o campo esteja ausente.
 */
export function inferRecordVehicleType(rec: MaintenanceRecord): VehicleType | undefined {
  if (rec.vehicleType) return rec.vehicleType;
  const revType = (rec.revisionType || '').toUpperCase();
  const workshop = (rec.workshop || '').toUpperCase();

  if (
    revType.includes('TK') ||
    revType.includes('HORAS') ||
    revType.includes('FILTRO DIESEL') ||
    workshop.includes('VIDEFRIGO') ||
    workshop.includes('MUNIQUE')
  ) {
    return 'tk';
  }
  if (revType.includes('FREIOS') || revType.includes('CARRETA') || workshop.includes('MOLA MUNDIAL')) {
    return 'carreta';
  }
  if (revType.includes('SCANIA') || revType.includes('REVISAO') || workshop.includes('COTRASA')) {
    return 'cavalo';
  }
  return undefined;
}

/**
 * Busca a última revisão REALIZADA/EXECUTADA para um veículo específico no histórico.
 */
export function getLatestExecutedRevisionForVehicle(
  vehicle: Vehicle,
  history: MaintenanceRecord[]
): MaintenanceRecord | null {
  if (!history || history.length === 0 || !vehicle) return null;

  const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  const vPlateClean = clean(vehicle.plate);

  const candidatePlates = new Set<string>();
  candidatePlates.add(vPlateClean);
  if (vehicle.plate) candidatePlates.add(vehicle.plate);

  if (vehicle.type === 'tk') {
    const truckAlias = TK_TO_TRUCK_MAPPING[vehicle.plate];
    if (truckAlias) {
      candidatePlates.add(truckAlias);
      candidatePlates.add(clean(truckAlias));
    }
    const tkAlias = TRUCK_TO_TK_MAPPING[vehicle.plate];
    if (tkAlias) {
      candidatePlates.add(tkAlias);
      candidatePlates.add(clean(tkAlias));
    }
    if (vehicle.coupledTkPlate) {
      candidatePlates.add(vehicle.coupledTkPlate);
      candidatePlates.add(clean(vehicle.coupledTkPlate));
    }
    if (vehicle.coupledCarretaPlate) {
      candidatePlates.add(vehicle.coupledCarretaPlate);
      candidatePlates.add(clean(vehicle.coupledCarretaPlate));
    }
  }

  const matchedRecords = history.filter((rec) => {
    if (!rec.plate && !rec.vehicleId) return false;

    // Apenas revisões realmente executadas / realizadas
    const isSim = rec.executed !== false && rec.executionStatus !== 'NÃO';
    if (!isSim) return false;

    const matchesId = rec.vehicleId === vehicle.id;
    const recPlateClean = clean(rec.plate);
    const matchesPlate = Boolean(
      (vPlateClean && recPlateClean === vPlateClean) ||
      candidatePlates.has(rec.plate) ||
      candidatePlates.has(recPlateClean)
    );

    if (!matchesId && !matchesPlate) return false;

    // Se a placa coincidir, checa o tipo do veículo para não misturar Carreta e TK com mesma placa
    const recType = inferRecordVehicleType(rec);
    if (recType && vehicle.type && recType !== vehicle.type) {
      return false;
    }

    return true;
  });

  if (matchedRecords.length === 0) return null;

  // Ordena por data mais recente e depois por horímetro/KM
  matchedRecords.sort((a, b) => {
    const timeDiff = parseDateScore(b.date) - parseDateScore(a.date);
    if (timeDiff !== 0) return timeDiff;
    return (b.meterReading || 0) - (a.meterReading || 0);
  });

  return matchedRecords[0];
}

/**
 * Reconcilia o estado dos veículos com a ÚLTIMA REVISÃO EXECUTADA no histórico.
 * Garante que veículos sempre sincronizem seus campos (última revisão, data, horímetro e meta programada).
 */
export function reconcileVehiclesWithHistory(
  vehicles: Vehicle[],
  history?: MaintenanceRecord[]
): Vehicle[] {
  if (!history || history.length === 0) return vehicles;

  return vehicles.map((v) => {
    const latest = getLatestExecutedRevisionForVehicle(v, history);
    if (!latest) return v;

    const copy: Vehicle = {
      ...v,
      lastMaintenanceDate: latest.date,
      lastMaintenanceType: latest.revisionType,
      lastMaintenanceMeter: latest.meterReading,
    };

    if (v.type === 'carreta') {
      const tara = 60000;
      copy.carretaTaraKm = tara;
      // Trava estritamente FIXA de 60.000 KM (Atenção aos 50.000 KM). NUNCA joga a mais nem acumula odômetro passado!
      copy.nextRevisionMeter = tara;
      copy.kmSinceLastMaintenance = (v.currentMeter < latest.meterReading)
        ? v.currentMeter
        : Math.max(0, v.currentMeter - latest.meterReading);
      copy.nextRevisionType = 'PREVENTIVA DE FREIOS (60.000 KM)';
    } else if (v.type === 'tk') {
      const is500 = isTkFilter500hPlate(v.plate);
      const is1000 = isTkFilter1000hPlate(v.plate);
      const interval = is500 ? 500 : is1000 ? 1000 : 1500;
      copy.nextRevisionMeter = latest.nextScheduledMeter && latest.nextScheduledMeter > latest.meterReading
        ? latest.nextScheduledMeter
        : (latest.meterReading + interval);
      copy.nextRevisionType = is500
        ? 'FILTRO DIESEL / 500H'
        : is1000
        ? 'PREVENTIVA 1.000H'
        : 'PREVENTIVA TK (1.500 HORAS)';
      copy.lastMaintenanceMeter = Math.max(v.lastMaintenanceMeter || 0, latest.meterReading);
      // Se a última revisão foi realizada em um horímetro maior, o horímetro atual não pode ser inferior
      if (v.currentMeter < latest.meterReading) {
        copy.currentMeter = latest.meterReading;
      }
    } else if (v.type === 'cavalo') {
      const taraKm = v.cavaloTaraKm || 40000;
      if (latest.nextScheduledMeter && latest.nextScheduledMeter > latest.meterReading) {
        copy.nextRevisionMeter = latest.nextScheduledMeter;
      } else {
        copy.nextRevisionMeter = latest.meterReading + taraKm;
      }

      if (isVehicleTimeBased(v)) {
        if (latest.nextScheduledDate) {
          copy.nextRevisionDate = latest.nextScheduledDate;
        } else if (latest.date) {
          copy.nextRevisionDate = addMonthsToDate(latest.date, 8);
        }
      }

      if (v.currentMeter < latest.meterReading) {
        copy.currentMeter = latest.meterReading;
      }
    }

    return copy;
  });
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function formatMonthYearLabel(year: number, monthIndex: number): string {
  return `${MONTH_NAMES_PT[monthIndex]}/${year}`;
}

export function formatCurrencyPtBr(value?: number | string | null): string {
  if (value === undefined || value === null) {
    return 'R$ 0,00';
  }
  const num = typeof value === 'number' ? value : Number(value);
  const safeVal = isNaN(num) ? 0 : num;
  return safeVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumberPtBr(value?: number | string | null, fallback = '0'): string {
  if (value === undefined || value === null) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return fallback;
  return num.toLocaleString('pt-BR');
}

// Identifica se a carreta possui 2 ou 3 eixos com base nas especificações oficiais fornecidas pelo usuário
export function getCarretaAxleType(plate: string, model: string): '3 EIXOS' | '2 EIXOS' {
  const spec = getTkSpecByPlate(plate);
  if (spec && spec.axles === '2 EIXOS') {
    return '2 EIXOS';
  }
  if (spec && spec.axles === '3 EIXOS') {
    return '3 EIXOS';
  }
  const modelUpper = (model || '').toUpperCase();
  if (modelUpper.includes('2 EIXOS') || modelUpper.includes('TOCO') || modelUpper.includes('DISTRIBUICAO URBANA')) {
    return '2 EIXOS';
  }
  return '3 EIXOS';
}

// Determina custo do cavalo conforme tabela CVM
export function getCavaloCost(revisionType?: string): RevisionCostInfo {
  const upper = (revisionType || '').toUpperCase();
  if (upper.includes('REVISAO L') || upper.includes('REVISÃO L')) {
    return CAVALO_REVISION_COSTS['REVISAO L'];
  }
  if (upper.includes('REVISAO M') || upper.includes('REVISÃO M')) {
    return CAVALO_REVISION_COSTS['REVISAO M'];
  }
  if (upper.includes('REVISAO S') || upper.includes('REVISÃO S')) {
    return CAVALO_REVISION_COSTS['REVISAO S'];
  }
  return CAVALO_REVISION_COSTS['REVISAO X'];
}

// Determina custo do TK conforme tabela TKFrios
export function getTkCost(revisionType?: string, meter?: number): RevisionCostInfo {
  const upper = (revisionType || '').toUpperCase();
  if (upper.includes('500') || upper.includes('FILTRO')) {
    return TK_REVISION_COSTS['500H'];
  }
  if (upper.includes('2.100') || upper.includes('2100') || upper.includes('INTERMEDIARIA')) {
    return TK_REVISION_COSTS['2100H'];
  }
  return TK_REVISION_COSTS['1500H'];
}

// Determina custo da Carreta conforme tabela Rodantes
export function getCarretaCost(plate: string, model: string): RevisionCostInfo {
  const axle = getCarretaAxleType(plate, model);
  return CARRETA_REVISION_COSTS[axle];
}

/**
 * Gera a projeção de manutenções mês a mês para toda a frota com:
 * 1. Sincronização automática quando uma revisão é realizada (avança o veículo para o ciclo futuro).
 * 2. Rollover automático: se um mês passou e a revisão não foi feita, joga para o próximo mês ativo.
 * 3. Base date dinâmica baseada no mês atual real.
 */
export function generateMaintenanceForecast(
  vehicles: Vehicle[],
  options: ForecastOptions = {}
): {
  groups: MonthForecastGroup[];
  totalLaborCost: number;
  totalPartsCost: number;
  totalCost: number;
  totalVehiclesProjected: number;
  maxMonthGroup: MonthForecastGroup | null;
} {
  const monthlyKmCavalo = options.monthlyKmCavalo || DEFAULT_MONTHLY_KM_CAVALO;
  const monthlyKmCarreta = options.monthlyKmCarreta || DEFAULT_MONTHLY_KM_CARRETA;
  const monthlyHoursTk = options.monthlyHoursTk || DEFAULT_MONTHLY_HOURS_TK;
  const horizonMonths = options.horizonMonths || 15;

  // 1. Reconciliação opcional com histórico de manutenções
  const activeVehicles = options.history ? reconcileVehiclesWithHistory(vehicles, options.history) : vehicles;

  // 2. Data base dinâmica: sempre ancorada no mês atual do sistema
  const now = options.baseDate || new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (ex: 9 = Outubro)
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const currentMonthLabel = `${MONTH_NAMES_PT[currentMonth]}/${currentYear}`;

  const forecastItems: ForecastItem[] = [];

  // Mapeamento dos meses no horizonte de projeção a partir do mês atual
  const monthGroupsMap: Record<string, MonthForecastGroup> = {};

  for (let i = 0; i < horizonMonths; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES_PT[m]}/${y}`;

    monthGroupsMap[key] = {
      monthKey: key,
      monthLabel: label,
      year: y,
      monthIndex: m,
      totalVehicles: 0,
      cavaloCount: 0,
      carretaCount: 0,
      tkCount: 0,
      totalLaborCost: 0,
      totalPartsCost: 0,
      totalCost: 0,
      cavaloCost: 0,
      carretaCost: 0,
      tkCost: 0,
      items: [],
    };
  }

  // Iterar por cada veículo e calcular data prevista de revisão
  activeVehicles.forEach((v) => {
    if (v.status === 'inactive' || v.observations?.includes('FORA DE ROTA')) {
      return; // Semirreboques fora de rota não entram na despesa mensal ativa
    }

    let projectedDate: Date;
    let explanation = '';
    let laborCost = 0;
    let totalCost = 0;
    let partsCost = 0;
    let serviceCategory = '';
    let isTimeBased = false;
    let isAttentionOnly = false;
    let isOverdueOrCurrent = false;

    if (v.type === 'cavalo') {
      const isTime = isVehicleTimeBased(v);
      isTimeBased = Boolean(isTime);

      const costInfo = getCavaloCost(v.nextRevisionType);
      laborCost = costInfo.laborCost;
      totalCost = costInfo.totalCost;
      partsCost = costInfo.partsCost;
      serviceCategory = `Revisão CVM Scania (${v.nextRevisionType || 'PREVENTIVA'})`;

      if (isTime && v.nextRevisionDate) {
        // Data programada com regra de 8 Meses
        const [pYear, pMonth, pDay] = v.nextRevisionDate.split('-').map(Number);
        projectedDate = new Date(pYear, pMonth - 1, pDay || 15);
        explanation = `Regra Temporal Concessionária: 8 Meses a partir da última revisão (${v.nextRevisionDate.split('-').reverse().join('/')}).`;
      } else {
        // Por quilometragem: trava de 40.000 KM para todos os cavalos com alerta aos 20.000 KM
        const lockKm = v.cavaloTaraKm && v.cavaloTaraKm > 0 ? v.cavaloTaraKm : 40000;
        const curMeter = typeof v.currentMeter === 'number' ? v.currentMeter : 0;
        const lastMeter = typeof v.lastMaintenanceMeter === 'number' ? v.lastMaintenanceMeter : 0;
        const kmSince = Math.max(0, curMeter - lastMeter);
        const diffToLock = lockKm - kmSince;
        const safeMonthlyKmCavalo = monthlyKmCavalo > 0 ? monthlyKmCavalo : DEFAULT_MONTHLY_KM_CAVALO;

        if (diffToLock < 0) {
          projectedDate = new Date(currentYear, currentMonth, 15);
          isOverdueOrCurrent = true;
          explanation = `Trava de ${lockKm.toLocaleString('pt-BR')} KM Vencida (${Math.abs(diffToLock).toLocaleString('pt-BR')} KM acima). Parada prioritária imediata.`;
        } else if (kmSince >= 20000) {
          projectedDate = new Date(currentYear, currentMonth, 20);
          isOverdueOrCurrent = true;
          explanation = `Atenção: ultrapassou 20.000 KM pós-revisão (rodou ${kmSince.toLocaleString('pt-BR')} KM de ${lockKm.toLocaleString('pt-BR')} KM). Agendamento prioritário.`;
        } else {
          const remainingTo20k = 20000 - kmSince;
          const monthsAhead = Math.min(horizonMonths - 1, Math.max(0, Math.round(remainingTo20k / safeMonthlyKmCavalo)));
          projectedDate = new Date(currentYear, currentMonth + monthsAhead, 15);
          explanation = `Projeção: faltam ${remainingTo20k.toLocaleString('pt-BR')} KM para bater 20.000 KM (média de ${safeMonthlyKmCavalo.toLocaleString('pt-BR')} KM/mês).`;
        }
      }
    } else if (v.type === 'carreta') {
      const axle = getCarretaAxleType(v.plate, v.model);
      const costInfo = CARRETA_REVISION_COSTS[axle] || CARRETA_REVISION_COSTS['3 EIXOS'];
      laborCost = costInfo.laborCost;
      totalCost = costInfo.totalCost;
      partsCost = costInfo.partsCost;
      serviceCategory = `Rodantes ${axle}`;

      const taraKm = 60000;
      const alertKm = 50000;
      const safeMonthlyKmCarreta = monthlyKmCarreta > 0 ? monthlyKmCarreta : DEFAULT_MONTHLY_KM_CARRETA;

      // Cálculo preciso dos KM rodados no ciclo atual (0 até 60.000 KM)
      let kmInCycle = 0;
      if (v.kmSinceLastMaintenance !== undefined && v.kmSinceLastMaintenance >= 0) {
        kmInCycle = v.kmSinceLastMaintenance;
      } else if (v.lastMaintenanceMeter && v.lastMaintenanceMeter > 0 && v.currentMeter >= v.lastMaintenanceMeter) {
        kmInCycle = v.currentMeter - v.lastMaintenanceMeter;
      } else if (v.lastMaintenanceMeter && v.currentMeter < v.lastMaintenanceMeter) {
        // O odômetro foi zerado no último atendimento
        kmInCycle = v.currentMeter;
      } else {
        kmInCycle = v.currentMeter % taraKm;
      }

      const diffTo60k = taraKm - kmInCycle;
      const diffTo50k = alertKm - kmInCycle;

      if (diffTo60k <= 0) {
        projectedDate = new Date(currentYear, currentMonth, 15);
        isOverdueOrCurrent = true;
        explanation = `Trava de 60.000 KM VENCIDA (${Math.abs(diffTo60k).toLocaleString('pt-BR')} KM excedentes | rodou ${kmInCycle.toLocaleString('pt-BR')} KM). Parada urgente para freios.`;
      } else if (kmInCycle >= alertKm) {
        projectedDate = new Date(currentYear, currentMonth, 20);
        isAttentionOnly = true;
        explanation = `Atenção: Atingiu meta de 50.000 KM de rodagem (rodou ${kmInCycle.toLocaleString('pt-BR')} KM no ciclo). Programar Preventiva de Freios (Trava de 60.000 KM: restam ${diffTo60k.toLocaleString('pt-BR')} KM).`;
      } else {
        const monthsAhead = Math.min(horizonMonths - 1, Math.max(0, Math.round(diffTo50k / safeMonthlyKmCarreta)));
        projectedDate = new Date(currentYear, currentMonth + monthsAhead, 15);
        explanation = `Faltam ${diffTo50k.toLocaleString('pt-BR')} KM para o alerta de 50.000 KM e ${diffTo60k.toLocaleString('pt-BR')} KM para a trava de 60.000 KM (rodou ${kmInCycle.toLocaleString('pt-BR')} KM | ~${safeMonthlyKmCarreta.toLocaleString('pt-BR')} KM/mês).`;
      }
    } else {
      // TK (Thermo King): Trava de 1.500 Horas para todos com alerta aos 500h (6 placas) ou 1.000h (EQF-4590)
      const is500h = isTkFilter500hPlate(v.plate) || Boolean(v.isTk500hFilterRule);
      const is1000h = isTkFilter1000hPlate(v.plate) || Boolean(v.isTk1000hFilterRule);
      const costInfo = getTkCost(v.nextRevisionType, v.nextRevisionMeter);
      laborCost = costInfo.laborCost;
      totalCost = costInfo.totalCost;
      partsCost = costInfo.partsCost;
      serviceCategory = is500h ? 'TKFrios Filtro 500H' : is1000h ? 'TKFrios Filtro 1.000H' : 'TKFrios Preventiva 1.500H';

      const curMeter = typeof v.currentMeter === 'number' ? v.currentMeter : 0;
      const lastMeter = typeof v.lastMaintenanceMeter === 'number' ? v.lastMaintenanceMeter : 0;
      const hoursSince = Math.max(0, curMeter - lastMeter);
      const diffTo1500 = 1500 - hoursSince;
      const safeMonthlyHoursTk = monthlyHoursTk > 0 ? monthlyHoursTk : DEFAULT_MONTHLY_HOURS_TK;

      if (diffTo1500 <= 0) {
        projectedDate = new Date(currentYear, currentMonth, 15);
        isOverdueOrCurrent = true;
        explanation = `Preventiva de 1.500H vencida em ${Math.abs(diffTo1500).toLocaleString('pt-BR')}h. Atendimento imediato na oficina autorizada.`;
      } else if (is500h && hoursSince >= 500) {
        projectedDate = new Date(currentYear, currentMonth, 20);
        isAttentionOnly = true;
        explanation = `Atenção: Atingiu meta de 500H para Troca de Filtro (rodou ${hoursSince.toLocaleString('pt-BR')}h). Troca de filtro necessária (Preventiva 1.500H: restam ${diffTo1500.toLocaleString('pt-BR')}h).`;
      } else if (is1000h && hoursSince >= 1000) {
        projectedDate = new Date(currentYear, currentMonth, 20);
        isAttentionOnly = true;
        explanation = `Atenção: Atingiu meta de 1.000H para Troca de Filtro (rodou ${hoursSince.toLocaleString('pt-BR')}h). Troca de filtro necessária (Preventiva 1.500H: restam ${diffTo1500.toLocaleString('pt-BR')}h).`;
      } else {
        const targetHours = is500h && hoursSince < 500 ? (500 - hoursSince) : is1000h && hoursSince < 1000 ? (1000 - hoursSince) : diffTo1500;
        const monthsAhead = Math.min(horizonMonths - 1, Math.max(0, Math.round(targetHours / safeMonthlyHoursTk)));
        projectedDate = new Date(currentYear, currentMonth + monthsAhead, 15);
        explanation = is500h
          ? `Faltam ${targetHours.toLocaleString('pt-BR')}h para a troca de filtro de 500H (~${(targetHours / safeMonthlyHoursTk).toFixed(1)} meses | Preventiva 1.500H).`
          : is1000h
          ? `Faltam ${targetHours.toLocaleString('pt-BR')}h para a troca de filtro de 1.000H (~${(targetHours / safeMonthlyHoursTk).toFixed(1)} meses | Preventiva 1.500H).`
          : `Faltam ${diffTo1500.toLocaleString('pt-BR')} horas para meta de 1.500H (~${(diffTo1500 / safeMonthlyHoursTk).toFixed(1)} meses).`;
      }
    }

    // =========================================================================
    // REGRA DE ROLAGEM AUTOMÁTICA DE MESES ("CASO PASSA O MÊS E NÃO FOI FEITO A REVISÃO, JOGA PRO PRÓXIMO MÊS ASSIM VAI")
    // =========================================================================
    let isRolledOver = false;
    let rolledOverFromMonth = '';

    const pYear = projectedDate.getFullYear();
    const pMonth = projectedDate.getMonth();

    // Se a data prevista recai em um mês do passado que já terminou:
    if (pYear < currentYear || (pYear === currentYear && pMonth < currentMonth)) {
      isRolledOver = true;
      isOverdueOrCurrent = true;
      rolledOverFromMonth = `${MONTH_NAMES_PT[pMonth]}/${pYear}`;
      // Reprograma automaticamente para o mês atual ativo:
      projectedDate = new Date(currentYear, currentMonth, 15);
      explanation = `Reprogramada: Revisão de ${rolledOverFromMonth} não realizada. Transferida automaticamente para ${currentMonthLabel} (Parada prioritária). ${explanation}`;
    }

    const y = projectedDate.getFullYear();
    const m = projectedDate.getMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthLabel = `${MONTH_NAMES_PT[m]}/${y}`;

    const spec = getTkSpecByPlate(v.plate);

    const item: ForecastItem = {
      id: `forecast-${v.id}-${monthKey}`,
      vehicleId: v.id,
      plate: v.plate,
      fleetNumber: v.fleetNumber,
      type: v.type,
      revisionType: v.nextRevisionType,
      serviceCategory,
      projectedDate: projectedDate.toISOString().split('T')[0],
      projectedMonthKey: monthKey,
      projectedMonthLabel: monthLabel,
      isOverdueOrCurrent: isOverdueOrCurrent || isRolledOver,
      isRolledOver,
      rolledOverFromMonth,
      isAttentionOnly,
      currentMeter: v.currentMeter,
      projectedMeter: v.type === 'carreta' ? (v.carretaTaraKm || 60000) : v.nextRevisionMeter,
      remainingMeter: v.type === 'carreta'
        ? ((v.carretaTaraKm || 60000) - v.currentMeter)
        : (v.nextRevisionMeter - v.currentMeter),
      meterUnit: v.meterUnit,
      laborCost,
      partsCost,
      totalCost,
      isTimeBased,
      bodySize: v.bodySize || spec?.size,
      axlesConfig: v.axlesConfig || spec?.axles,
      explanation,
    };

    forecastItems.push(item);

    // Adiciona ao mês correspondente caso esteja no horizonte
    if (monthGroupsMap[monthKey]) {
      const g = monthGroupsMap[monthKey];
      g.items.push(item);
      g.totalVehicles += 1;
      g.totalLaborCost += laborCost;
      g.totalPartsCost += partsCost;
      g.totalCost += totalCost;

      if (v.type === 'cavalo') {
        g.cavaloCount += 1;
        g.cavaloCost += totalCost;
      } else if (v.type === 'carreta') {
        g.carretaCount += 1;
        g.carretaCost += totalCost;
      } else {
        g.tkCount += 1;
        g.tkCost += totalCost;
      }
    }
  });

  // Ordenar os itens dentro de cada grupo por placa alfabética (A-Z)
  Object.values(monthGroupsMap).forEach((g) => {
    g.items.sort((a, b) => a.plate.localeCompare(b.plate));
  });

  const sortedGroups = Object.values(monthGroupsMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  let totalLaborCost = 0;
  let totalPartsCost = 0;
  let totalCost = 0;
  let maxMonthGroup: MonthForecastGroup | null = null;

  sortedGroups.forEach((g) => {
    totalLaborCost += g.totalLaborCost;
    totalPartsCost += g.totalPartsCost;
    totalCost += g.totalCost;
    if (!maxMonthGroup || g.totalCost > maxMonthGroup.totalCost) {
      maxMonthGroup = g;
    }
  });

  return {
    groups: sortedGroups,
    totalLaborCost,
    totalPartsCost,
    totalCost,
    totalVehiclesProjected: forecastItems.length,
    maxMonthGroup,
  };
}

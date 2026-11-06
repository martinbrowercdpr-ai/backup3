import { Vehicle, FleetAlert, AlertLevel, VehicleType, RevisionType } from '../types';

export const CAVALO_REVISIONS = [
  {
    type: 'REVISAO S',
    intervalKm: 20000,
    cycleLockKm: 40000,
    totalCost: 3449.87,
    description: 'Revisão Standard Motor (Óleo 41L LDF-3 + Kit de Filtros + Graxa Scania) • R$ 3.449,87. Roda +20.000 KM para Revisão X.',
  },
  {
    type: 'REVISAO X',
    intervalKm: 20000,
    cycleLockKm: 40000,
    totalCost: 1134.97,
    description: 'Revisão Rápida de Filtros e Graxa Scania • R$ 1.134,97. Alerta obrigatório aos +20.000 KM pós-S ou pós-M para fechar a trava de 40.000 KM.',
  },
  {
    type: 'REVISAO M',
    intervalKm: 20000,
    cycleLockKm: 40000,
    totalCost: 4247.16,
    description: 'Revisão Intermediária Média (Óleo 41L + Elemento do Filtro + Kit Manutenção + Diagnose) • R$ 4.247,16. Roda +20.000 KM para Revisão X.',
  },
  {
    type: 'REVISAO L',
    intervalKm: 40000,
    cycleLockKm: 40000,
    totalCost: 9473.89,
    description: 'REVISÃO COMPLETA TREM DE FORÇA (Câmbio 17L, Diferencial 13L, Motor 41L e 8 Filtros) • R$ 9.473,89. Única que roda 40.000 KM direto sem Revisão X por ser completa já!',
  },
];

export const CARRETA_REVISIONS = [
  { type: 'PREVENTIVA DE FREIOS (60.000 KM)', intervalKm: 60000, description: 'Inspeção preventiva de freios: lonas, catracas, tambores e cuícas (Trava Oficial 60.000 KM • Atenção aos 50.000 KM)' },
  { type: 'PREVENTIVA DE FREIOS (50.000 KM)', intervalKm: 50000, description: 'Inspeção preventiva de freios ampliada (Alerta 50.000 KM)' },
  { type: 'PREVENTIVA DE FREIOS (30.000 KM)', intervalKm: 30000, description: 'Inspeção preventiva de freios anterior' },
];

// Placas de carretas da frota
export const CARRETA_30K_PLATES: string[] = [];
export const CARRETA_50K_PLATES: string[] = [];
export const CARRETA_50K_PLATES_COMPAT: string[] = [];

export function isCarreta30k(plate?: string): boolean {
  return false;
}

export function isCarreta50k(plate?: string): boolean {
  return false;
}

export function getCarretaIntervalKm(plate?: string): number {
  return 60000;
}

export const TK_REVISIONS = [
  { type: 'PREVENTIVA TK (1.500 HORAS)', intervalHours: 1500, description: 'Preventiva periódica de 1.500 horas: óleo diesel TK, compressor, correias e revisão geral (+1.500 Horas)' },
  { type: 'PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO', intervalHours: 500, description: 'Troca de filtros preventiva TK: óleo, combustível e ar (Regra Oficial das 7 Placas • 500H)' },
  { type: 'MANUTENÇÃO PREVENTIVA', intervalHours: 1000, description: 'Manutenção preventiva periódica do equipamento Thermo King (+1.000 Horas)' },
  { type: 'MANUTENÇÃO CORRETIVA', intervalHours: 0, description: 'Manutenção corretiva / reparo técnico de emergência no equipamento de refrigeração' },
  { type: 'PREVENTIVA TK (1.000 HORAS)', intervalHours: 1000, description: 'Preventiva periódica de 1.000 horas: correias, filtros e gás (+1.000 Horas)' },
];

// Oficinas homologadas oficiais de manutenção Thermo King
export const TK_AUTHORIZED_WORKSHOPS = [
  'VIDEFRIGO',
  'MUNIQUE',
  'VAMOS',
] as const;

// Oficinas homologadas oficiais de manutenção Carretas (3 oficinas oficiais)
export const CARRETA_AUTHORIZED_WORKSHOPS = [
  'MOLA MUNDIAL',
  'COROA',
  'VAMOS',
] as const;

// Oficina homologada oficial de manutenção Cavalos (apenas SCANIA)
export const CAVALO_AUTHORIZED_WORKSHOPS = [
  'SCANIA',
] as const;

// As 10 placas de cavalo com regra temporal de 8 MESES sincronizada com a data atual
export const TIME_BASED_CAVALO_PLATES = [
  'EKH-9243',
  'TCK-6F97',
  'TCK-6F83',
  'FLZ-6536',
  'FQL-0949',
  'FSN-6361',
  'EGY-1481',
  'FSJ-8793',
  'GFT-2I15',
  'GJM-2431',
  // Compatibilidade de buscas
  'EKH-9424',
  'EKH-9428',
  'FSG-7745',
];

export function isTimeBasedCavalo(plate?: string, isTimeBasedRevision?: boolean): boolean {
  if (typeof isTimeBasedRevision === 'boolean') {
    return isTimeBasedRevision;
  }
  if (!plate) return false;
  return TIME_BASED_CAVALO_PLATES.includes(plate);
}

export function isVehicleTimeBased(vehicle?: { type?: string; plate?: string; isTimeBasedRevision?: boolean } | null): boolean {
  if (!vehicle) return false;
  if (vehicle.type && vehicle.type !== 'cavalo') return false;
  if (typeof vehicle.isTimeBasedRevision === 'boolean') {
    return vehicle.isTimeBasedRevision;
  }
  return isTimeBasedCavalo(vehicle.plate);
}

// As 6 placas oficiais exclusivas de Thermo King com REGRA DE 500 HORAS (TROCA DE FILTRO):
// FFW-5963, FGA-3945, FQQ-0212, FWL-8547, GDM-4926, GJX-2504
export const TK_FILTER_500H_PLATES = [
  'FFW-5963',
  'FGA-3945',
  'FQQ-0212',
  'FWL-8547',
  'GDM-4926',
  'GJX-2504',
];

// A placa oficial exclusiva de Thermo King com REGRA DE 1.000 HORAS (TROCA DE FILTRO):
// EQF-4590 (acoplada ao cavalo DUE-4590)
export const TK_FILTER_1000H_PLATES = [
  'EQF-4590',
  'DUE-4590',
];

export function isTkFilter500hPlate(plate?: string): boolean {
  if (!plate) return false;
  const clean = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return TK_FILTER_500H_PLATES.some(
    (p) => p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === clean
  );
}

export function isTkFilter1000hPlate(plate?: string): boolean {
  if (!plate) return false;
  const clean = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return TK_FILTER_1000H_PLATES.some(
    (p) => p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === clean
  );
}

/**
 * Adiciona meses a uma data YYYY-MM-DD
 */
export function addMonthsToDate(dateStr: string, months: number = 8): string {
  try {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    d.setMonth(d.getMonth() + months);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  } catch (e) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + months);
    return fallback.toISOString().split('T')[0];
  }
}

/**
 * Formata data YYYY-MM-DD para DD/MM/AAAA
 */
export function formatDatePtBr(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Calcula a diferença em dias entre duas datas YYYY-MM-DD
 */
export function getDaysDifference(targetDateStr: string, baseDateStr?: string): number {
  const target = new Date(targetDateStr + 'T00:00:00').getTime();
  const base = baseDateStr
    ? new Date(baseDateStr + 'T00:00:00').getTime()
    : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00').getTime();

  const diffTime = target - base;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula o nível de alerta para o veículo com base no medidor atual e meta da próxima revisão,
 * incluindo regra temporal de 8 MESES para os 10 cavalos designados
 */
export function calculateAlert(vehicle: Vehicle): FleetAlert {
  const isTimeBased = isVehicleTimeBased(vehicle);

  // Unidade desativada ou fora de rota não gera falso alarme
  if (vehicle.status === 'inactive' || vehicle.observations?.includes('FORA DE ROTA')) {
    return {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      fleetNumber: vehicle.fleetNumber,
      type: vehicle.type,
      level: 'ok',
      nextRevisionType: vehicle.nextRevisionType,
      currentMeter: vehicle.currentMeter,
      targetMeter: vehicle.nextRevisionMeter,
      difference: 0,
      percentUsed: 0,
      unit: vehicle.meterUnit,
      message: 'FORA DE ROTA • Unidade temporariamente desativada / em pátio',
      isTimeBased: false,
    };
  }

  // Cálculo de datas para regra temporal (8 Meses) se aplicável
  let daysRemaining: number | undefined;
  let monthsRemaining: number | undefined;
  let targetDate = vehicle.nextRevisionDate;
  const todayStr = new Date().toISOString().split('T')[0];
  const daysSinceLast = vehicle.lastMaintenanceDate
    ? Math.max(0, getDaysDifference(todayStr, vehicle.lastMaintenanceDate))
    : undefined;

  if (isTimeBased) {
    if (!targetDate) {
      targetDate = addMonthsToDate(vehicle.lastMaintenanceDate || '2026-03-20', 8);
    }
    daysRemaining = getDaysDifference(targetDate);
    monthsRemaining = parseFloat((daysRemaining / 30.4).toFixed(1));
  }

  // 1. Cálculo por KM ou Horas
  const isTk500h = vehicle.type === 'tk' && (vehicle.isTk500hFilterRule || isTkFilter500hPlate(vehicle.plate));
  const isTk1000h = vehicle.type === 'tk' && (vehicle.isTk1000hFilterRule || isTkFilter1000hPlate(vehicle.plate));
  const isCarreta = vehicle.type === 'carreta';
  const isCavalo = vehicle.type === 'cavalo';
  // REGRA OFICIAL SOLICITADA PELO USUÁRIO:
  // "carreta com 60k trava vencidas, atenção com 50k"
  const carretaLockKm = isCarreta
    ? (vehicle.carretaTaraKm && vehicle.carretaTaraKm > 0 ? vehicle.carretaTaraKm : 60000)
    : undefined;
  const carretaAlertKm = 50000;
  // Para carretas: o medidor atual (currentMeter) representa a quilometragem rodada no ciclo da trava de 60.000 KM.
  // Quando realiza manutenção de freio, o KM é zerado (0 KM) e o ciclo recomeça do zero!
  const kmUsedInCycle = isCarreta ? Math.max(0, vehicle.currentMeter) : 0;

  // Para cavalos mecânicos (Scania): regra de ciclo com trava de 40.000 KM e alerta aos +20.000 KM para Revisão X
  // (Exceto Revisão L que já é completa e roda 40.000 KM direto para a Revisão S)
  const lastRevType = (vehicle.lastMaintenanceType || '').toUpperCase();
  const nextRevType = (vehicle.nextRevisionType || '').toUpperCase();
  const kmSinceLastMaint = Math.max(0, vehicle.currentMeter - (vehicle.lastMaintenanceMeter || 0));

  // Para carretas: diffKm = trava de 60k - km rodados
  // Para cavalos: trava de 40.000 KM com alerta intermediário aos 20.000 KM
  // Para TKs: trava geral de 1.500 Horas para TODOS os equipamentos
  let diffKm = 0;
  let totalInterval = 20000;
  let usedInInterval = kmSinceLastMaint;

  if (isCarreta && carretaLockKm) {
    diffKm = Math.round(carretaLockKm - kmUsedInCycle);
    totalInterval = carretaLockKm;
    usedInInterval = kmUsedInCycle;
  } else if (isCavalo) {
    // REGRA GERAL DE CAVALOS: Trava de 40.000 KM para TODOS os cavalos.
    // O ciclo tem trava máxima de 40.000 KM.
    // - SÓ joga as placas para VENCIDAS quando ULTRAPASSAR esses 40.000 KM!
    // - Caso ultrapasse os 20.000 KM joga alerta para ATENÇÃO em vez de vencidas!
    const cavaloLockKm = vehicle.cavaloTaraKm && vehicle.cavaloTaraKm > 0 ? vehicle.cavaloTaraKm : 40000;
    totalInterval = cavaloLockKm;
    usedInInterval = kmSinceLastMaint;
    diffKm = Math.round(cavaloLockKm - kmSinceLastMaint);
  } else if (vehicle.type === 'tk') {
    // REGRA GERAL DE TKS: Trava de 1.500 HORAS para TODOS os equipamentos TK.
    const hoursSince = Math.max(0, vehicle.currentMeter - (vehicle.lastMaintenanceMeter || 0));
    totalInterval = 1500;
    usedInInterval = hoursSince;
    diffKm = Math.round(1500 - hoursSince);
  } else {
    diffKm = Math.round(vehicle.nextRevisionMeter - vehicle.currentMeter);
    totalInterval = Math.max(1, Math.round(vehicle.nextRevisionMeter - vehicle.lastMaintenanceMeter));
    usedInInterval = Math.max(0, Math.round(vehicle.currentMeter - vehicle.lastMaintenanceMeter));
  }

  const percentUsedKm = Math.min(100, Math.round((usedInInterval / totalInterval) * 100));

  let level: AlertLevel = 'ok';
  let message = '';

  const isHours = vehicle.meterUnit === 'HORAS';
  const warningMargin = isTk500h ? 50 : isHours ? 100 : 2500; // 50h para filtro TK, 100h para TK geral, 2.500 km para veículos

  if (isTimeBased) {
    // REGRA DE 8 MESES: Monitora prazo temporal na concessionária e odômetro com trava de 40.000 KM
    const sinceText = daysSinceLast !== undefined ? ` • Última há ${daysSinceLast} dias` : '';
    const safeDays = daysRemaining ?? 0;
    const cavaloLockKm = vehicle.cavaloTaraKm && vehicle.cavaloTaraKm > 0 ? vehicle.cavaloTaraKm : 40000;
    const cavaloAlertKm = 20000;

    // Regra estrita: Só joga para VENCIDA se ultrapassar os 40.000 KM ou se o prazo de 8 meses expirou!
    if (kmSinceLastMaint > cavaloLockKm) {
      level = 'critical';
      const overdue = kmSinceLastMaint - cavaloLockKm;
      message = `TRAVA DE ${cavaloLockKm.toLocaleString('pt-BR')} KM VENCIDA! Ultrapassou em ${overdue.toLocaleString('pt-BR')} KM (rodou ${kmSinceLastMaint.toLocaleString('pt-BR')} de ${cavaloLockKm.toLocaleString('pt-BR')} KM). Realizar manutenção imediatamente!`;
    } else if (safeDays <= 0) {
      level = 'critical';
      const daysOver = Math.abs(safeDays);
      message = `VENCIDA POR DATA (8 MESES)! Prazo expirou em ${formatDatePtBr(targetDate)} (há ${daysOver} dias${sinceText})`;
    } else if (kmSinceLastMaint >= cavaloAlertKm) {
      // Ultrapassou 20.000 KM: Alerta ATENÇÃO (não vencida)
      level = 'warning';
      const restToLock = cavaloLockKm - kmSinceLastMaint;
      message = `ATENÇÃO: Ultrapassou 20.000 KM (rodou ${kmSinceLastMaint.toLocaleString('pt-BR')} KM pós-${lastRevType || 'Revisão'}). Realizar ${vehicle.nextRevisionType || 'Revisão'}! Trava máxima de ${cavaloLockKm.toLocaleString('pt-BR')} KM (restam ${restToLock.toLocaleString('pt-BR')} KM para travar). Prazo de 8 meses: ${safeDays}d.`;
    } else if (safeDays <= 30) {
      level = 'warning';
      message = `ATENÇÃO PRAZO (8 MESES): Faltam apenas ${safeDays} dias (vence em ${formatDatePtBr(targetDate)})${sinceText}`;
    } else if (kmSinceLastMaint >= cavaloAlertKm - 2500) {
      level = 'warning';
      const rest = cavaloAlertKm - kmSinceLastMaint;
      message = `ATENÇÃO: Faltam apenas ${rest.toLocaleString('pt-BR')} KM para bater 20.000 KM e realizar a REVISÃO X (prazo de 8 meses em ${formatDatePtBr(targetDate)})`;
    } else {
      level = 'ok';
      message = `Em dia (8 Meses): Restam ${safeDays} dias (~${monthsRemaining} meses) • Vence em ${formatDatePtBr(targetDate)}${sinceText}`;
    }
  } else if (isCarreta && carretaLockKm) {
    // REGRA OFICIAL SOLICITADA PELO USUÁRIO:
    // "carreta com 60k trava vencidas, atenção com 50k"
    // Trava de 60.000 KM para Vencidas, e Alerta de Atenção aos 50.000 KM!
    if (kmUsedInCycle > carretaLockKm) {
      // SÓ JOGA AS CARRETAS PARA VENCIDAS QUANDO ULTRAPASSAR 60.000 KM!
      level = 'critical';
      const overdue = kmUsedInCycle - carretaLockKm;
      message = `TRAVA DE ${carretaLockKm.toLocaleString('pt-BR')} KM VENCIDA! Ultrapassou em ${overdue.toLocaleString('pt-BR')} KM (rodou ${kmUsedInCycle.toLocaleString('pt-BR')} de ${carretaLockKm.toLocaleString('pt-BR')} KM). Realizar manutenção de freios imediatamente!`;
    } else if (kmUsedInCycle >= carretaAlertKm) {
      // CASO ULTRAPASSE OU ATINJA OS 50.000 KM JOGA ALERTA PARA ATENÇÃO EM VEZ DE VENCIDAS!
      level = 'warning';
      const restToLock = carretaLockKm - kmUsedInCycle;
      message = `ATENÇÃO: Ultrapassou 50.000 KM (rodou ${kmUsedInCycle.toLocaleString('pt-BR')} KM no ciclo). Programar Preventiva de Freios! Trava máxima de ${carretaLockKm.toLocaleString('pt-BR')} KM (restam ${restToLock.toLocaleString('pt-BR')} KM para travar).`;
    } else if (kmUsedInCycle >= carretaAlertKm - 2500) {
      // Faltam menos de 2.500 KM para bater 50.000 KM (a partir de 47.500 KM)
      level = 'warning';
      const restToAlert = carretaAlertKm - kmUsedInCycle;
      message = `ATENÇÃO: Faltam apenas ${restToAlert.toLocaleString('pt-BR')} KM para atingir 50.000 KM (rodou ${kmUsedInCycle.toLocaleString('pt-BR')} KM | Trava ${carretaLockKm.toLocaleString('pt-BR')} KM).`;
    } else {
      level = 'ok';
      const restToAlert = carretaAlertKm - kmUsedInCycle;
      message = `Em dia (Trava ${carretaLockKm.toLocaleString('pt-BR')} KM): Rodou ${kmUsedInCycle.toLocaleString('pt-BR')} KM (restam ${restToAlert.toLocaleString('pt-BR')} KM para o alerta de 50.000 KM).`;
    }
  } else if (isCavalo) {
    // REGRA OFICIAL SOLICITADA PELO USUÁRIO:
    // "E TODOS CAVALOS ESTÃO COM TRAVA DE 40000 , SO JOGA AS PLACAS PARA VENCIDAS QUANDO ULTRAPASSAR ESSES 40000 CASO ULTRAPASSE OS 20000 JOGA ALERTA PARA ATENÇÃO ENVEZ DE VENCIDAS."
    const cavaloLockKm = vehicle.cavaloTaraKm && vehicle.cavaloTaraKm > 0 ? vehicle.cavaloTaraKm : 40000;
    const cavaloAlertKm = 20000;

    if (kmSinceLastMaint > cavaloLockKm) {
      // SÓ JOGA AS PLACAS PARA VENCIDAS QUANDO ULTRAPASSAR ESSES 40.000 KM!
      level = 'critical';
      const overdue = kmSinceLastMaint - cavaloLockKm;
      message = `TRAVA DE ${cavaloLockKm.toLocaleString('pt-BR')} KM VENCIDA! Ultrapassou em ${overdue.toLocaleString('pt-BR')} KM (rodou ${kmSinceLastMaint.toLocaleString('pt-BR')} de ${cavaloLockKm.toLocaleString('pt-BR')} KM). Parada urgente para manutenção!`;
    } else if (kmSinceLastMaint >= cavaloAlertKm) {
      // CASO ULTRAPASSE OS 20.000 KM JOGA ALERTA PARA ATENÇÃO EM VEZ DE VENCIDAS!
      level = 'warning';
      const restToLock = cavaloLockKm - kmSinceLastMaint;
      message = `ATENÇÃO: Ultrapassou 20.000 KM (rodou ${kmSinceLastMaint.toLocaleString('pt-BR')} KM pós-${vehicle.lastMaintenanceType || 'Revisão'}). Realizar ${vehicle.nextRevisionType || 'Revisão'}! Trava máxima de ${cavaloLockKm.toLocaleString('pt-BR')} KM (restam ${restToLock.toLocaleString('pt-BR')} KM para travar).`;
    } else if (kmSinceLastMaint >= cavaloAlertKm - 2500) {
      // Faltam menos de 2.500 KM para bater 20.000 KM
      level = 'warning';
      const restToAlert = cavaloAlertKm - kmSinceLastMaint;
      message = `ATENÇÃO: Faltam apenas ${restToAlert.toLocaleString('pt-BR')} KM para bater 20.000 KM e realizar ${vehicle.nextRevisionType || 'a Revisão'} (Trava ${cavaloLockKm.toLocaleString('pt-BR')} KM).`;
    } else {
      level = 'ok';
      const restToAlert = cavaloAlertKm - kmSinceLastMaint;
      message = `Em dia: Rodou ${kmSinceLastMaint.toLocaleString('pt-BR')} KM pós-${vehicle.lastMaintenanceType || 'Revisão'} (restam ${restToAlert.toLocaleString('pt-BR')} KM para o alerta de 20.000 KM | Trava ${cavaloLockKm.toLocaleString('pt-BR')} KM).`;
    }
  } else if (vehicle.type === 'tk') {
    // REGRA OFICIAL DE TKS SOLICITADA PELO USUÁRIO:
    // "DEIXE TUDO COM 1500HRS MANUTENÇÃO
    // POREM TEM 6 PLACAS 500HRS 1 PLACA 1000HRS TROCA DE FILTRO:
    // FFW-5963, FGA-3945, FQQ-0212, FWL-8547, GDM-4926, GJX-2504
    // EQF-4590 1000HORAS
    // QUANDO ATINGIR ESSAS HORAS MANDAR ALERTA EM ATENÇÃO NÃO MOSTRAR VENCIDAS SO QUANDO ULTRAPASSAR AS 1500HRS."
    const tkLockHours = 1500;
    const hoursSince = Math.max(0, vehicle.currentMeter - (vehicle.lastMaintenanceMeter || 0));
    const restTo1500 = tkLockHours - hoursSince;

    if (hoursSince > tkLockHours) {
      // SÓ JOGA AS PLACAS PARA VENCIDAS QUANDO ULTRAPASSAR AS 1.500 HORAS!
      level = 'critical';
      const overdue = hoursSince - tkLockHours;
      message = `PREVENTIVA TK (1.500H) VENCIDA! Ultrapassou em ${overdue.toLocaleString('pt-BR')} HORAS da meta de 1.500H (rodou ${hoursSince.toLocaleString('pt-BR')} de 1.500h). Atendimento urgente na VIDEFRIGO!`;
    } else if (isTk500h && hoursSince >= 500) {
      // CASO ATINJA 500 HORAS NAS 6 PLACAS: ALERTA EM ATENÇÃO EM VEZ DE VENCIDAS!
      level = 'warning';
      message = `ATENÇÃO FILTRO TK (500H): Atingiu ${hoursSince.toLocaleString('pt-BR')}h pós-revisão (meta de 500h para Troca de Filtros). Realizar troca de filtros! Trava de Preventiva TK aos 1.500H (restam ${restTo1500.toLocaleString('pt-BR')}h para travar).`;
    } else if (isTk1000h && hoursSince >= 1000) {
      // CASO ATINJA 1.000 HORAS NA PLACA EQF-4590: ALERTA EM ATENÇÃO EM VEZ DE VENCIDAS!
      level = 'warning';
      message = `ATENÇÃO FILTRO TK (1.000H): Atingiu ${hoursSince.toLocaleString('pt-BR')}h pós-revisão (meta de 1.000h para Troca de Filtros). Realizar troca de filtros! Trava de Preventiva TK aos 1.500H (restam ${restTo1500.toLocaleString('pt-BR')}h para travar).`;
    } else if (hoursSince >= tkLockHours - 100) {
      // Faltam menos de 100 horas para a trava de 1.500 horas
      level = 'warning';
      message = `ATENÇÃO PREVENTIVA TK (1.500H): Faltam apenas ${restTo1500.toLocaleString('pt-BR')} HORAS para a trava periódica de 1.500H (rodou ${hoursSince.toLocaleString('pt-BR')}h).`;
    } else if (isTk500h && hoursSince >= 450) {
      // Faltam menos de 50 horas para atingir 500H de filtro
      level = 'warning';
      const restTo500 = 500 - hoursSince;
      message = `ATENÇÃO: Faltam apenas ${restTo500.toLocaleString('pt-BR')} HORAS para a Troca de Filtro de 500H (rodou ${hoursSince.toLocaleString('pt-BR')}h | Preventiva aos 1.500H).`;
    } else if (isTk1000h && hoursSince >= 950) {
      // Faltam menos de 50 horas para atingir 1.000H de filtro
      level = 'warning';
      const restTo1000 = 1000 - hoursSince;
      message = `ATENÇÃO: Faltam apenas ${restTo1000.toLocaleString('pt-BR')} HORAS para a Troca de Filtro de 1.000H (rodou ${hoursSince.toLocaleString('pt-BR')}h | Preventiva aos 1.500H).`;
    } else {
      level = 'ok';
      if (isTk500h) {
        const rest500 = 500 - hoursSince;
        message = `Em dia (Filtro 500H): Rodou ${hoursSince.toLocaleString('pt-BR')}h pós-revisão (faltam ${rest500.toLocaleString('pt-BR')}h para troca de filtros | Preventiva 1.500H).`;
      } else if (isTk1000h) {
        const rest1000 = 1000 - hoursSince;
        message = `Em dia (Filtro 1.000H): Rodou ${hoursSince.toLocaleString('pt-BR')}h pós-revisão (faltam ${rest1000.toLocaleString('pt-BR')}h para troca de filtros | Preventiva 1.500H).`;
      } else {
        message = `Em dia (Preventiva 1.500H): Restam ${restTo1500.toLocaleString('pt-BR')} HORAS para a meta de 1.500H (rodou ${hoursSince.toLocaleString('pt-BR')}h).`;
      }
    }
  } else if (diffKm <= 0) {
    level = 'critical';
    const overdue = Math.abs(diffKm);
    message = `VENCIDA POR ${isHours ? 'HORÍMETRO' : 'KM'}! Ultrapassou em ${overdue.toLocaleString('pt-BR')} ${vehicle.meterUnit}`;
  } else if (diffKm <= warningMargin) {
    level = 'warning';
    message = `Atenção: faltam ${diffKm.toLocaleString('pt-BR')} ${vehicle.meterUnit} para bater a meta programada`;
  } else {
    level = 'ok';
    message = `Em dia: restam ${diffKm.toLocaleString('pt-BR')} ${vehicle.meterUnit} para bater a meta programada`;
  }

  // Progresso para regra temporal: uso baseado nos dias desde a última manutenção (ciclo de 8 meses = ~243 dias)
  const timePercent = isTimeBased
    ? (daysRemaining !== undefined && daysRemaining <= 0
        ? 100
        : daysSinceLast !== undefined
        ? Math.min(100, Math.max(5, Math.round((daysSinceLast / 243) * 100)))
        : 50)
    : percentUsedKm;

  return {
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    fleetNumber: vehicle.fleetNumber,
    type: vehicle.type,
    level,
    nextRevisionType: vehicle.type === 'tk' ? 'PREVENTIVA TK (1.500 HORAS)' : vehicle.type === 'carreta' ? 'PREVENTIVA DE FREIOS (60.000 KM)' : vehicle.nextRevisionType,
    currentMeter: vehicle.currentMeter,
    targetMeter: vehicle.type === 'tk' ? (vehicle.lastMaintenanceMeter || 0) + 1500 : isCarreta ? (carretaLockKm || 60000) : vehicle.nextRevisionMeter,
    difference: diffKm,
    percentUsed: isTimeBased ? timePercent : (diffKm <= 0 ? 100 : percentUsedKm),
    unit: vehicle.meterUnit,
    message,
    isTimeBased,
    targetDate,
    daysRemaining,
    monthsRemaining,
    daysSinceLast,
    isTk500hFilterRule: isTk500h,
    isTk1000hFilterRule: isTk1000h,
    carretaTaraKm: carretaLockKm,
    kmSinceLastMaintenance: kmUsedInCycle,
  };
}

/**
 * Sugere a próxima revisão e a quilometragem/horas alvo com base na última revisão feita
 * Regra Cavalo: X -> S (+20.000 KM) -> L (+20.000 KM) -> M (+20.000 KM) -> X (+20.000 KM)
 * Regra Cavalo 8 Meses: Tara temporal sincronizada com dia atual + 8 meses
 * Regra Carreta: Trava de 30.000 KM (Preventiva de Freios) ou 50.000 KM (Preventiva de Freios 50K) com reset completo a cada revisão
 * Regra TK 500H: Troca de filtros a cada 500 Horas nas placas designadas
 * Regra TK Geral: 1.000 Horas / 1.500 Horas desde a última preventiva
 */
export function getNextRevisionSuggestion(
  type: VehicleType,
  currentMeter: number,
  lastRevisionType?: RevisionType,
  plate?: string,
  executionDate?: string,
  isTimeBasedRevision?: boolean
): { nextType: RevisionType; nextTarget: number; intervalAdded: number; nextDate?: string } {
  const isTimeBased = plate ? isTimeBasedCavalo(plate, isTimeBasedRevision) : false;
  const baseDate = executionDate || new Date().toISOString().split('T')[0];
  const nextDate = isTimeBased ? addMonthsToDate(baseDate, 8) : undefined;

  if (type === 'cavalo') {
    // Regra oficial solicitada pelo usuário:
    // Trava de 40.000 KM nas revisões, porém ao rodar +20.000 KM dispara alerta porque já tem que fazer a REVISÃO X!
    // Exemplo: Fez a Revisão S -> roda +20.000 KM para fazer a Revisão X -> roda +20.000 KM para fechar os 40k e fazer a Revisão M!
    // Única que NÃO faz esse ciclo é a REVISÃO L porque ela já faz e é COMPLETA (roda 40.000 KM direto para a Revisão S)!
    const lastUpper = (lastRevisionType || '').toUpperCase();

    if (lastUpper.includes('REVISAO S') || lastUpper.includes('REVISÃO S')) {
      // Fez Revisão S -> roda +20.000 KM para fazer a Revisão X
      return {
        nextType: 'REVISAO X',
        nextTarget: currentMeter + 20000,
        intervalAdded: 20000,
        nextDate,
      };
    } else if (lastUpper.includes('REVISAO M') || lastUpper.includes('REVISÃO M')) {
      // Fez Revisão M -> roda +20.000 KM para fazer a Revisão X
      return {
        nextType: 'REVISAO X',
        nextTarget: currentMeter + 20000,
        intervalAdded: 20000,
        nextDate,
      };
    } else if (lastUpper.includes('REVISAO L') || lastUpper.includes('REVISÃO L')) {
      // REVISÃO L: Única que NÃO faz o ciclo intermediário de X! Roda 40.000 KM DIRETO para a Revisão S!
      return {
        nextType: 'REVISAO S',
        nextTarget: currentMeter + 40000,
        intervalAdded: 40000,
        nextDate,
      };
    } else if (lastUpper.includes('REVISAO X') || lastUpper.includes('REVISÃO X')) {
      // Fez Revisão X: roda +20.000 KM para completar a trava de 40.000 KM.
      // Se era o ciclo pós-S, próxima é Revisão M. Se era pós-M, próxima é Revisão L.
      return {
        nextType: 'REVISAO M',
        nextTarget: currentMeter + 20000,
        intervalAdded: 20000,
        nextDate,
      };
    } else {
      // Padrão de entrada
      return {
        nextType: 'REVISAO X',
        nextTarget: currentMeter + 20000,
        intervalAdded: 20000,
        nextDate,
      };
    }
  }

  if (type === 'carreta') {
    // Regra oficial Martin Brower solicitada pelo usuário:
    // "carreta com 60k trava vencidas, atenção com 50k"
    // Trava de 60.000 KM para Vencidas, e Alerta de Atenção aos 50.000 KM.
    // Ao realizar a manutenção de freio, a quilometragem é ZERADA (0 KM) e o novo ciclo começa do zero até a trava (60.000 KM).
    const interval = 60000;
    return {
      nextType: 'PREVENTIVA DE FREIOS (60.000 KM)',
      nextTarget: interval,
      intervalAdded: interval,
    };
  }

  if (type === 'tk') {
    // REGRA OFICIAL SOLICITADA PELO USUÁRIO:
    // "DEIXE TUDO COM 1500HRS MANUTENÇÃO"
    return {
      nextType: 'PREVENTIVA TK (1.500 HORAS)',
      nextTarget: currentMeter + 1500,
      intervalAdded: 1500,
    };
  }

  return { nextType: 'REVISAO PREVENTIVA', nextTarget: currentMeter + 20000, intervalAdded: 20000, nextDate };
}

export function formatMeter(val?: number | null, unit: 'KM' | 'HORAS' = 'KM'): string {
  const safeVal = typeof val === 'number' && !isNaN(val) ? val : 0;
  return `${safeVal.toLocaleString('pt-BR')} ${unit}`;
}

export function getVehicleTypeLabel(type: VehicleType): string {
  switch (type) {
    case 'cavalo':
      return 'Cavalo Mecânico';
    case 'carreta':
      return 'Carreta / Semi-Reboque';
    case 'tk':
      return 'Equipamento TK (Thermo King)';
  }
}

export function getAlertBadgeClasses(level: AlertLevel): {
  bg: string;
  text: string;
  border: string;
  indicator: string;
  label: string;
} {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-rose-950/60',
        text: 'text-rose-300',
        border: 'border-rose-700/60',
        indicator: 'bg-rose-500',
        label: 'Vencida / Crítico',
      };
    case 'warning':
      return {
        bg: 'bg-amber-950/60',
        text: 'text-amber-300',
        border: 'border-amber-700/60',
        indicator: 'bg-amber-500',
        label: 'Próxima da Revisão',
      };
    case 'ok':
      return {
        bg: 'bg-emerald-950/60',
        text: 'text-emerald-300',
        border: 'border-emerald-700/60',
        indicator: 'bg-emerald-500',
        label: 'Em Dia (Regular)',
      };
  }
}

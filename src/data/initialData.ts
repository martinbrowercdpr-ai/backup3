import { Vehicle, MaintenanceRecord, CavaloRevisionType, CarretaRevisionType, TkRevisionType } from '../types';
import {
  TIME_BASED_CAVALO_PLATES,
  addMonthsToDate,
  isTkFilter500hPlate,
  isTkFilter1000hPlate,
  isCarreta50k,
  getCarretaIntervalKm,
  CARRETA_30K_PLATES,
  CARRETA_50K_PLATES,
} from '../utils/maintenanceCalculations';
import { CAVALO_REVISIONS_HISTORY, RAW_CAVALO_REVISIONS } from './cavaloRevisionsHistory';
import { CARRETA_REVISIONS_HISTORY, RAW_CARRETA_REVISIONS } from './carretaRevisionsHistory';
import { RAW_TK_REVISIONS, TK_REVISIONS_HISTORY } from './tkRevisionsHistory';
import { getTkSpecByPlate } from './tkSpecs';

// Listas exatas fornecidas pelo usuário:
export const CAVALO_PLATES = [
  'BSZ-5472', 'BYI-8416', 'BZF-5414', 'CMS-9451', 'CUI-5453', 'DSK-0867', 'DUE-4590',
  'ECD-4961', 'EDB-3291', 'EFU-1180', 'EGI-3648', 'EGT-8399', 'EGZ-0853', 'EKH-9243',
  'TCK-6F97', 'TCK-6F83', 'ELY-7782', 'EVA-2941', 'EXH-9119', 'EXN-8837', 'EZL-0857',
  'FLZ-6536', 'FOU-4119', 'FQL-0949', 'EGY-1481', 'FSJ-8793', 'FSN-6361', 'GAA-4627',
  'GBL-4254', 'GEW-0966', 'GFT-2I15', 'GIF-4605', 'GII-6B45', 'GIW-1096', 'GJM-2431',
  'GJS-4581', 'SYM-8I96', 'SYM-8I98'
];

// Quilometragem atual exata fornecida pelo usuário para cada uma das 38 placas de Cavalos:
export const CAVALO_REAL_KM: Record<string, number> = {
  'BSZ-5472': 803449,
  'BYI-8416': 841124,
  'BZF-5414': 858036,
  'CMS-9451': 881839,
  'CUI-5453': 846327,
  'DSK-0867': 748128,
  'DUE-4590': 243262,
  'ECD-4961': 798987,
  'EDB-3291': 812655,
  'EFU-1180': 806570,
  'EGI-3648': 801670,
  'EGT-8399': 819833,
  'EGZ-0853': 833188,
  'EKH-9243': 335141,
  'TCK-6F97': 749506,
  'TCK-6F83': 799749,
  'EKH-9424': 749506, // compatibilidade
  'EKH-9428': 799749, // compatibilidade
  'ELY-7782': 849394,
  'EXH-9119': 840912,
  'EXN-8837': 797233,
  'EZL-0857': 857253,
  'EVA-2941': 855822,
  'FLZ-6536': 630999,
  'FOU-4119': 803052,
  'FQL-0949': 227162,
  'FSN-6361': 236907,
  'EGY-1481': 939548,
  'FSG-7745': 939548, // compatibilidade
  'FSJ-8793': 473582,
  'GAA-4627': 828778,
  'GBL-4254': 922598,
  'GEW-0966': 890111,
  'GFT-2I15': 216858,
  'GIF-4605': 917313,
  'GII-6B45': 850154,
  'GIW-1096': 882920,
  'GJS-4581': 902596,
  'GJM-2431': 214009,
  'SYM-8I96': 277374,
  'SYM-8I98': 277722,
};

export const CARRETA_PLATES = [
  'EKH-7453', 'EKH-7455', 'EKH-7461', 'EKH-7463', 'EKH-7464', 'EKH-7465', 'EKH-9262',
  'EKH-9281', 'FFW-5963', 'FGA-3945', 'FNM-6G51', 'FQQ-0212', 'FQQ-4043', 'FRF-6972',
  'FRH-1171', 'FSJ-4324', 'FWL-8547', 'GDM-4926', 'GDS-1002', 'GDY-1637', 'GJX-2504',
  'SUS-7I12', 'TJJ-8D10', 'TKE-1H73', 'TKE-2H65', 'TKI-1A27', 'TKI-5D20', 'TKP-4I92',
  'TCK-6F83', 'TCK-6F97', 'EGY-1481'
];

// Quilometragem real fornecida pelo usuário para cada uma das 31 carretas
export const CARRETA_REAL_KM: Record<string, number | 'FORA DE ROTA'> = {
  'EKH-7453': 35914,
  'EKH-7455': 68419,
  'EKH-7461': 61270,
  'EKH-7463': 54743,
  'EKH-7464': 22539,
  'EKH-7465': 22397,
  'EKH-9262': 'FORA DE ROTA',
  'EKH-9281': 31430,
  'FFW-5963': 31540,
  'FGA-3945': 31690,
  'FNM-6G51': 41282,
  'FQQ-0212': 16485,
  'FQQ-4043': 13488,
  'FRF-6972': 37353,
  'FRH-1171': 6670,
  'FSJ-4324': 14991,
  'FWL-8547': 28900,
  'GDM-4926': 50386,
  'GDS-1002': 23838,
  'GDY-1637': 10904,
  'GJX-2504': 31434,
  'SUS-7I12': 55567,
  'TJJ-8D10': 21772,
  'TKE-1H73': 44825,
  'TKE-2H65': 22960,
  'TKI-1A27': 67738,
  'TKI-5D20': 43539,
  'TKP-4I92': 26126,
  'TCK-6F83': 0,
  'TCK-6F97': 0,
  'EGY-1481': 0,
};

export const TRUCK_TO_TK_MAPPING: Record<string, string> = {
  'DUE-4590': 'EQF-4590',
  'EKH-9243': 'EQF-9243',
  'TCK-6F97': 'EQF-9424',
  'TCK-6F83': 'EQF-9428',
  'EKH-9424': 'EQF-9424', // alias compatibilidade
  'EKH-9428': 'EQF-9428', // alias compatibilidade
  'FLZ-6536': 'EQF-6536',
  'FQL-0949': 'EQF-0949',
  'GJM-2431': 'EQF-2431',
  'FSJ-8793': 'EQF-8793',
  'FSN-6361': 'EQF-6361',
  'GFT-2I15': 'EQF-2I15',
};

export const TK_TO_TRUCK_MAPPING: Record<string, string> = {
  'EQF-4590': 'DUE-4590',
  'EQF-9243': 'EKH-9243',
  'EQF-9424': 'TCK-6F97',
  'EQF-9428': 'TCK-6F83',
  'EQF-6536': 'FLZ-6536',
  'EQF-0949': 'FQL-0949',
  'EQF-2431': 'GJM-2431',
  'EQF-8793': 'FSJ-8793',
  'EQF-6361': 'FSN-6361',
  'EQF-2I15': 'GFT-2I15',
};

export const TK_PLATES = [
  'EQF-4590', 'EKH-7453', 'EKH-7455', 'EKH-7461', 'EKH-7463', 'EKH-7464', 'EKH-7465',
  'EQF-9243', 'EKH-9262', 'EKH-9281', 'EQF-9424', 'EQF-9428', 'FFW-5963', 'FGA-3945',
  'EQF-6536', 'FNM-6G51', 'EQF-0949', 'FQQ-0212', 'FQQ-4043', 'FRF-6972', 'FRH-1171',
  'FSJ-4324', 'EQF-8793', 'EQF-6361', 'FWL-8547', 'GDM-4926', 'GDM-4936', 'GDS-1002', 'GDY-1637',
  'EQF-2I15', 'EQF-2431', 'GJX-2504', 'SUS-7I12', 'TJJ-8D10', 'TKE-1H73', 'TKE-2H65',
  'TKI-1A27', 'TKI-5D20', 'TKP-4I92'
];

// Horímetro real fornecido pelo usuário para cada uma das 38 unidades TK
export const TK_REAL_HOURS: Record<string, number> = {
  'EQF-4590': 13285,
  'DUE-4590': 13285, // alias compatibilidade
  'EKH-7453': 36164,
  'EKH-7455': 41156,
  'EKH-7461': 37151,
  'EKH-7463': 41752,
  'EKH-7464': 36658,
  'EKH-7465': 3005,
  'EQF-9243': 34659,
  'EKH-9243': 34659, // alias compatibilidade
  'EKH-9262': 36059,
  'EKH-9281': 38227,
  'EQF-9424': 39834,
  'TCK-6F97': 39834, // alias caminhão acoplado
  'EKH-9424': 39834, // alias compatibilidade
  'EQF-9428': 41053,
  'TCK-6F83': 41053, // alias caminhão acoplado
  'EKH-9428': 41053, // alias compatibilidade
  'FFW-5963': 27510,
  'FGA-3945': 29238,
  'EQF-6536': 12006,
  'FLZ-6536': 12006, // alias compatibilidade
  'EQF-0949': 18302,
  'FQL-0949': 18302, // alias compatibilidade
  'FQQ-0212': 23747,
  'FQQ-4043': 36558,
  'FRF-6972': 24920,
  'FSJ-4324': 6703,
  'FWL-8547': 19967,
  'FRH-1171': 24129,
  'GDM-4926': 28621,
  'GDM-4936': 28621,
  'GDS-1002': 30629,
  'GDY-1637': 32399,
  'EQF-2I15': 15839,
  'GFT-2I15': 15839, // alias compatibilidade
  'EQF-2431': 16806,
  'GJM-2431': 16806, // alias compatibilidade
  'GJX-2504': 25162,
  'TKE-1H73': 1591,
  'TKP-4I92': 4825,
  'TKI-5D20': 4714,
  'TKE-2H65': 4798,
  'TJJ-8D10': 4525,
  'SUS-7I12': 4168,
  'TKI-1A27': 6016,
  'EQF-8793': 45238,
  'FSJ-8793': 45238, // alias compatibilidade
  'EQF-6361': 6385,
  'FSN-6361': 6385, // alias compatibilidade
  'FNM-6G51': 4246,
};

const CAVALO_MODELS = [
  { brand: 'Scania', model: 'R450 6x2 Highline' },
  { brand: 'Volvo', model: 'FH 540 6x4 Globetrotter' },
  { brand: 'Mercedes-Benz', model: 'Actros 2651 6x4' },
  { brand: 'DAF', model: 'XF 530 Space Cab' },
  { brand: 'Scania', model: 'R500 6x2 Streamline' },
];

const CARRETA_MODELS = [
  { brand: 'Randon', model: 'Semirreboque Frigorífico 3 Eixos' },
  { brand: 'Facchini', model: 'Semirreboque Furgão Frigorífico 28 Paletes' },
  { brand: 'Guerra', model: 'Semirreboque Frigorífico Termoacústico' },
  { brand: 'Randon', model: 'Semirreboque Baú Carga Geral' },
];

const TK_MODELS = [
  { brand: 'Thermo King', model: 'SLXi 400 Whisper Pro' },
  { brand: 'Thermo King', model: 'Precedent S-600 Tier 4' },
  { brand: 'Thermo King', model: 'Advancer A-400 com TracKing' },
  { brand: 'Thermo King', model: 'SLX 300 Smart Reefer' },
];

const CAVALO_REVISION_CYCLES: { last: CavaloRevisionType; next: CavaloRevisionType }[] = [
  { last: 'REVISAO X', next: 'REVISAO S' },
  { last: 'REVISAO S', next: 'REVISAO L' },
  { last: 'REVISAO L', next: 'REVISAO M' },
  { last: 'REVISAO M', next: 'REVISAO X' },
];

// Gerador robusto dos veículos da frota baseado nas placas exatas do usuário
export const INITIAL_VEHICLES: Vehicle[] = [
  // --- 1. CAVALOS (38 PLACAS) ---
  ...CAVALO_PLATES.map((plate, index): Vehicle => {
    const cycle = CAVALO_REVISION_CYCLES[index % CAVALO_REVISION_CYCLES.length];
    const modelInfo = CAVALO_MODELS[index % CAVALO_MODELS.length];
    const fleetNumber = plate; // Placa real, sem prenome artificial

    // Base de KM real fornecida pelo usuário
    const currentMeter = CAVALO_REAL_KM[plate] || (100000 + index * 10000);
    const interval = 20000; // Regra estrita: sempre +20.000 KM para a próxima preventiva (X -> S -> L -> M -> X)

    // Dados reais das revisões da concessionária Scania fornecidas pelo usuário
    const revs = RAW_CAVALO_REVISIONS.filter((r) => r.plate === plate).sort((a, b) => a.meter - b.meter);
    const executedRevs = revs.filter((r) => r.executed === 'SIM');
    const pendingRevs = revs.filter((r) => r.executed === 'NÃO');

    const lastExec = executedRevs.length > 0 ? executedRevs[executedRevs.length - 1] : null;
    const nextPlan = pendingRevs.length > 0 ? pendingRevs[0] : null;

    let lastMaintenanceType: CavaloRevisionType = cycle.last;
    let nextRevisionType: CavaloRevisionType = cycle.next;
    let lastMaintenanceMeter: number = Math.floor(currentMeter / interval) * interval;
    let nextRevisionMeter: number = lastMaintenanceMeter + interval;
    let lastDate = `2026-0${(index % 8) + 1}-15`;

    if (lastExec) {
      lastMaintenanceType = (lastExec.type.includes('M') ? 'REVISAO M' : lastExec.type.includes('L') ? 'REVISAO L' : lastExec.type.includes('S') ? 'REVISAO S' : 'REVISAO X') as CavaloRevisionType;
      lastMaintenanceMeter = lastExec.meter;
      if (lastExec.date) {
        lastDate = lastExec.date;
      }
    }

    if (nextPlan) {
      nextRevisionType = (nextPlan.type.includes('M') ? 'REVISAO M' : nextPlan.type.includes('L') ? 'REVISAO L' : nextPlan.type.includes('S') ? 'REVISAO S' : 'REVISAO X') as CavaloRevisionType;
      nextRevisionMeter = nextPlan.meter;
    } else if (lastExec) {
      // Regra oficial solicitada:
      // Trava de 40.000 KM com alerta aos 20.000 KM para Revisão X.
      // - Fez S: próxima é REVISAO X (+20.000 KM)
      // - Fez M: próxima é REVISAO X (+20.000 KM)
      // - Fez L: ÚNICA QUE NÃO FAZ ESSE CICLO PORQUE É COMPLETA! Roda 40.000 KM direto para REVISAO S!
      // - Fez X: próxima é a grande revisão seguinte (M ou L) aos +20.000 KM
      if (lastMaintenanceType === 'REVISAO S') {
        nextRevisionType = 'REVISAO X';
        nextRevisionMeter = lastExec.meter + 20000;
      } else if (lastMaintenanceType === 'REVISAO M') {
        nextRevisionType = 'REVISAO X';
        nextRevisionMeter = lastExec.meter + 20000;
      } else if (lastMaintenanceType === 'REVISAO L') {
        nextRevisionType = 'REVISAO S';
        nextRevisionMeter = lastExec.meter + 40000; // Direto 40k!
      } else {
        // Fez X: completa a trava de 40.000 KM
        nextRevisionType = 'REVISAO M';
        nextRevisionMeter = lastExec.meter + 20000;
      }
    }

    // Regra dos 10 cavalos com tara temporal de 8 Meses sincronizada
    const isTimeBased = TIME_BASED_CAVALO_PLATES.includes(plate);
    const nextRevisionDate = isTimeBased ? addMonthsToDate(lastDate, 8) : undefined;
    const tkSpec = getTkSpecByPlate(plate);

    const coupledTk = TRUCK_TO_TK_MAPPING[plate];

    return {
      id: `veh-cav-${index + 1}`,
      plate,
      fleetNumber,
      type: 'cavalo',
      brand: '',
      model: '',
      year: 2021 + (index % 4),
      currentMeter,
      meterUnit: 'KM',
      lastMaintenanceDate: lastDate,
      lastMaintenanceType,
      lastMaintenanceMeter,
      nextRevisionType,
      nextRevisionMeter,
      isTimeBasedRevision: isTimeBased,
      timeBasedIntervalMonths: isTimeBased ? 8 : undefined,
      nextRevisionDate,
      coupledTkPlate: coupledTk,
      bodySize: tkSpec?.size,
      axlesConfig: tkSpec?.axles,
      status: 'active',
      observations: coupledTk
        ? `Cavalo/Caminhão operacional acoplado ao Thermo King ${coupledTk}. ${isTimeBased ? `Regra de 8 MESES: Próxima ${nextRevisionType} (+20.000 KM ou até ${nextRevisionDate}).` : `Regra: Tara + 20.000 KM para ${nextRevisionType}.`}`
        : isTimeBased
        ? `Cavalo Operacional com Regra de 8 MESES. Próxima: ${nextRevisionType} (+20.000 KM ou até ${nextRevisionDate}).`
        : `Cavalo mecânico operacional. Regra: Tara + 20.000 KM para ${nextRevisionType}.`,
      updatedAt: '2026-09-17',
    };
  }),

  // --- 2. CARRETAS (28 PLACAS COM KM REAL E TRAVA DE 30.000 KM) ---
  ...CARRETA_PLATES.map((plate, index): Vehicle => {
    const rawKm = CARRETA_REAL_KM[plate];
    const isOutOfRoute = rawKm === 'FORA DE ROTA';
    const currentMeter = isOutOfRoute ? 0 : (typeof rawKm === 'number' ? rawKm : 0);
    const taraKm = 60000; // REGRA OFICIAL SOLICITADA: Trava de 60.000 KM para Vencidas, Atenção com 50.000 KM
    const alertKm = 50000;
    const modelInfo = CARRETA_MODELS[index % CARRETA_MODELS.length];
    const fleetNumber = plate; // Placa real, sem prenome artificial

    // Histórico oficial das revisões de carretas fornecidas pelo usuário
    const revs = RAW_CARRETA_REVISIONS.filter((r) => r.plate === plate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastExec = revs.length > 0 ? revs[revs.length - 1] : null;

    const lastMaintenanceMeter = 0;
    const nextRevisionMeter = taraKm;
    const lastType: CarretaRevisionType = 'PREVENTIVA DE FREIOS (60.000 KM)';
    const nextType: CarretaRevisionType = 'PREVENTIVA DE FREIOS (60.000 KM)';
    const lastDate = lastExec?.date || `2026-0${(index % 7) + 2}-10`;

    const tkSpec = getTkSpecByPlate(plate);

    const isOverdue = currentMeter > taraKm;
    const overdueKm = currentMeter - taraKm;
    const isAttention = currentMeter >= alertKm && currentMeter <= taraKm;
    const remainingToAlert = alertKm - currentMeter;
    const remainingToLock = taraKm - currentMeter;

    return {
      id: `veh-crt-${index + 1}`,
      plate,
      fleetNumber,
      type: 'carreta',
      brand: '',
      model: '',
      year: 2020 + (index % 5),
      currentMeter,
      meterUnit: 'KM',
      lastMaintenanceDate: lastDate,
      lastMaintenanceType: lastType,
      lastMaintenanceMeter,
      nextRevisionType: nextType,
      nextRevisionMeter,
      carretaTaraKm: taraKm,
      kmSinceLastMaintenance: currentMeter,
      bodySize: tkSpec?.size,
      axlesConfig: tkSpec?.axles,
      status: isOutOfRoute ? 'inactive' : 'active',
      observations: isOutOfRoute
        ? 'FORA DE ROTA • Semirreboque temporariamente desativado / em pátio'
        : isOverdue
        ? `Semirreboque com Trava de 60.000 KM. KM rodado: ${currentMeter.toLocaleString('pt-BR')} KM (VENCIDA: ultrapassou em ${overdueKm.toLocaleString('pt-BR')} KM da trava). Ao realizar revisão de freios, o KM será zerado (0).`
        : isAttention
        ? `Semirreboque em ATENÇÃO (alerta de 50.000 KM atingido). KM rodado: ${currentMeter.toLocaleString('pt-BR')} KM (Restam ${remainingToLock.toLocaleString('pt-BR')} KM para a trava de 60.000 KM). Programar revisão de freios.`
        : `Semirreboque com Trava de 60.000 KM (Atenção aos 50K). KM rodado: ${currentMeter.toLocaleString('pt-BR')} KM (Restam ${remainingToAlert.toLocaleString('pt-BR')} KM para o alerta de 50.000 KM).`,
      updatedAt: '2026-09-17',
    };
  }),

  // --- 3. TK THERMO KING (38 PLACAS COM HORÍMETRO REAL) ---
  ...TK_PLATES.map((plate, index): Vehicle => {
    const currentMeter = TK_REAL_HOURS[plate] ?? (1000 + index * 100);
    const modelInfo = TK_MODELS[index % TK_MODELS.length];
    const fleetNumber = plate === 'EQF-4590' ? 'DUE-4590' : plate;
    const tkSpec = getTkSpecByPlate(plate);

    const isTk500h = isTkFilter500hPlate(plate);
    const isTk1000h = isTkFilter1000hPlate(plate);
    const coupledTruck = TK_TO_TRUCK_MAPPING[plate];
    const coupledVehicle = coupledTruck || (CARRETA_PLATES.includes(plate) ? plate : undefined);

    const revs = RAW_TK_REVISIONS.filter((r) => r.plate === plate || (coupledTruck && r.plate === coupledTruck));
    const executedRevs = revs.filter((r) => r.executed === 'SIM');
    const pendingRevs = revs.filter((r) => r.executed === 'NÃO');

    const lastExec = executedRevs.length > 0 ? executedRevs[executedRevs.length - 1] : null;
    const nextPlan = pendingRevs.length > 0 ? pendingRevs[0] : null;

    let lastMaintenanceMeter = 0;
    let nextRevisionMeter = 0;
    let lastType: TkRevisionType = isTk500h
      ? 'PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO'
      : isTk1000h
      ? 'PREVENTIVA TK (1.000 HORAS)'
      : 'PREVENTIVA TK (1.500 HORAS)';
    let nextType: TkRevisionType = isTk500h
      ? 'PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO'
      : isTk1000h
      ? 'PREVENTIVA TK (1.000 HORAS)'
      : 'PREVENTIVA TK (1.500 HORAS)';
    let lastDate = `2026-0${(index % 8) + 1}-22`;

    if (isTk500h) {
      // Regra estrita de 500 Horas: Troca de Filtro (óleo, combustível e ar)
      const interval = 500;
      const baseRound = Math.floor(currentMeter / interval) * interval;
      lastMaintenanceMeter = baseRound;
      nextRevisionMeter = baseRound + interval;
    } else if (isTk1000h) {
      // Regra estrita de 1.000 Horas: Troca de Filtro (EQF-4590)
      const interval = 1000;
      const baseRound = Math.floor(currentMeter / interval) * interval;
      lastMaintenanceMeter = baseRound;
      nextRevisionMeter = baseRound + interval;
    } else if (lastExec) {
      lastMaintenanceMeter = lastExec.meter;
      if (lastExec.date) {
        lastDate = lastExec.date;
      }
      lastType = 'PREVENTIVA TK (1.500 HORAS)';
      if (nextPlan) {
        nextRevisionMeter = nextPlan.meter;
        nextType = 'PREVENTIVA TK (1.500 HORAS)';
      } else {
        nextRevisionMeter = lastExec.meter + 1500;
      }
    } else if (nextPlan) {
      nextRevisionMeter = nextPlan.meter;
      nextType = 'PREVENTIVA TK (1.500 HORAS)';
    } else {
      // Regra padrão baseada no horímetro acumulado: Trava de 1.500 Horas
      const interval = 1500;
      const baseRound = Math.floor(currentMeter / interval) * interval;
      lastMaintenanceMeter = baseRound;
      nextRevisionMeter = baseRound + interval;
      lastType = 'PREVENTIVA TK (1.500 HORAS)';
      nextType = 'PREVENTIVA TK (1.500 HORAS)';
    }

    const workshopInfo = lastExec ? ` • Última oficina: ${lastExec.workshop}` : '';
    const pendingInfo = nextPlan ? ` • Programada: ${nextPlan.workshop} (${nextPlan.meter.toLocaleString('pt-BR')}h)` : '';
    const filterRuleInfo = isTk500h ? ' • 🛢️ REGRA ESPECIAL 500H (Troca de Filtros)' : isTk1000h ? ' • 🛢️ REGRA ESPECIAL 1.000H (Troca de Filtros)' : '';

    return {
      id: `veh-tk-${index + 1}`,
      plate,
      fleetNumber,
      type: 'tk',
      brand: '',
      model: '',
      year: 2021 + (index % 4),
      currentMeter,
      meterUnit: 'HORAS',
      lastMaintenanceDate: lastDate,
      lastMaintenanceType: lastType,
      lastMaintenanceMeter,
      nextRevisionType: nextType,
      nextRevisionMeter,
      isTk500hFilterRule: isTk500h,
      isTk1000hFilterRule: isTk1000h,
      coupledCarretaPlate: coupledVehicle,
      coupledTkPlate: coupledTruck,
      bodySize: tkSpec?.size,
      axlesConfig: tkSpec?.axles,
      status: 'active',
      observations: coupledTruck
        ? `Equipamento Thermo King acoplado ao Caminhão ${coupledTruck}. Horímetro atual: ${currentMeter.toLocaleString('pt-BR')}h. Próxima: ${nextType} aos ${nextRevisionMeter.toLocaleString('pt-BR')}h${workshopInfo}${pendingInfo}.`
        : isTk500h
        ? `Equipamento Thermo King • REGRA ESPECIAL 500H (Troca de Filtros • 6 Placas Homologadas). Horímetro atual: ${currentMeter.toLocaleString('pt-BR')}h. Próxima troca: ${nextRevisionMeter.toLocaleString('pt-BR')}h${workshopInfo}.`
        : isTk1000h
        ? `Equipamento Thermo King • REGRA ESPECIAL 1.000H (Troca de Filtros • Placa EQF-4590). Horímetro atual: ${currentMeter.toLocaleString('pt-BR')}h. Próxima troca: ${nextRevisionMeter.toLocaleString('pt-BR')}h${workshopInfo}.`
        : `Equipamento Thermo King com Horímetro Real (${currentMeter.toLocaleString('pt-BR')} horas de motor diesel). Próxima: ${nextType} aos ${nextRevisionMeter.toLocaleString('pt-BR')}h${workshopInfo}${pendingInfo}${filterRuleInfo}.`,
      updatedAt: '2026-09-18',
    };
  }),
];

// Histórico inicial de manutenções com as revisões reais fornecidas pelo usuário (Cavalos, Carretas e TKs)
export const INITIAL_MAINTENANCE_HISTORY: MaintenanceRecord[] = [
  ...CAVALO_REVISIONS_HISTORY,
  ...CARRETA_REVISIONS_HISTORY,
  ...TK_REVISIONS_HISTORY,
];

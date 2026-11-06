export interface TkSpecInfo {
  plate: string;
  size: 'PEQUENA' | 'GRANDE' | 'BITRUCK' | 'TRUCK' | 'VUC';
  axles: '2 EIXOS' | '3 EIXOS' | 'TOCO';
}

export const RAW_TK_SPECS: TkSpecInfo[] = [
  // PEQUENA - 2 EIXOS
  { plate: 'GDM-4936', size: 'PEQUENA', axles: '2 EIXOS' },
  { plate: 'GDM-4926', size: 'PEQUENA', axles: '2 EIXOS' }, // variação/frota
  { plate: 'GDY-1637', size: 'PEQUENA', axles: '2 EIXOS' },
  { plate: 'GDS-1002', size: 'PEQUENA', axles: '2 EIXOS' },
  { plate: 'EKH-9262', size: 'PEQUENA', axles: '2 EIXOS' },
  { plate: 'EKH-7464', size: 'PEQUENA', axles: '2 EIXOS' },
  { plate: 'FWL-8547', size: 'PEQUENA', axles: '2 EIXOS' },

  // GRANDE - 3 EIXOS
  { plate: 'TKE-1H73', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'TKP-4I92', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'TKI-5D20', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'TKE-2H65', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'TJJ-8D10', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'SUS-7I12', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FNM-6G51', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'TKI-1A27', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FQQ-0212', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FFW-5963', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'GJX-2504', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FRH-1171', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'EKH-7461', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'EKH-7453', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'EKH-9281', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'EKH-7463', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'EKH-7455', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'EKH-7465', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FSJ-4324', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FRF-6972', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FQQ-4043', size: 'GRANDE', axles: '3 EIXOS' },
  { plate: 'FGA-3945', size: 'GRANDE', axles: '3 EIXOS' },

  // BITRUCK - 2 EIXOS
  { plate: 'EQF-9428', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'EQF9428', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'TCK-6F83', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'TCK6F83', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'EKH-9428', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'EKH9428', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'EQF-9424', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'EQF9424', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'TCK-6F97', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'TCK6F97', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'EKH-9424', size: 'BITRUCK', axles: '2 EIXOS' },
  { plate: 'EKH9424', size: 'BITRUCK', axles: '2 EIXOS' },

  // TRUCK - 2 EIXOS
  { plate: 'EGY-1481', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EGY1481', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'FSG-7745', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'FSG7745', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF-4590', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF4590', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'DUE-4590', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF-6536', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF6536', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'FLZ-6536', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF-8793', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF8793', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'FSJ-8793', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF-6361', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'EQF6361', size: 'TRUCK', axles: '2 EIXOS' },
  { plate: 'FSN-6361', size: 'TRUCK', axles: '2 EIXOS' },

  // VUC - TOCO
  { plate: 'EQF-2I15', size: 'VUC', axles: 'TOCO' },
  { plate: 'EQF2I15', size: 'VUC', axles: 'TOCO' },
  { plate: 'GFT-2I15', size: 'VUC', axles: 'TOCO' },
  { plate: 'EQF-2431', size: 'VUC', axles: 'TOCO' },
  { plate: 'EQF2431', size: 'VUC', axles: 'TOCO' },
  { plate: 'GJM-2431', size: 'VUC', axles: 'TOCO' },
  { plate: 'EQF-0949', size: 'VUC', axles: 'TOCO' },
  { plate: 'EQF0949', size: 'VUC', axles: 'TOCO' },
  { plate: 'FQL-0949', size: 'VUC', axles: 'TOCO' },
  { plate: 'EQF-9243', size: 'VUC', axles: 'TOCO' },
  { plate: 'EQF9243', size: 'VUC', axles: 'TOCO' },
  { plate: 'EKH-9243', size: 'VUC', axles: 'TOCO' },
];

export function getTkSpecByPlate(plate: string): TkSpecInfo | undefined {
  const clean = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return RAW_TK_SPECS.find((s) => s.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === clean);
}

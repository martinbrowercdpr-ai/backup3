import { MaintenanceRecord } from '../types';

export interface RawTkRevision {
  plate: string;
  meter: number;
  service: string;
  type: 'PREVENTIVA' | 'CORRETIVA';
  workshop: string;
  executed: 'SIM' | 'NÃO';
  date: string;
}

export const RAW_TK_REVISIONS: RawTkRevision[] = [
  // EQF-4590 (Acoplado ao Caminhão DUE-4590)
  { plate: 'EQF-4590', meter: 12563, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-21' },
  { plate: 'EQF-4590', meter: 14000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },
  // DUE-4590 (Alias de compatibilidade)
  { plate: 'DUE-4590', meter: 12563, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-21' },
  { plate: 'DUE-4590', meter: 14000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // EKH-7453
  { plate: 'EKH-7453', meter: 26443, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-22' },
  { plate: 'EKH-7453', meter: 27960, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-11-01' },
  { plate: 'EKH-7453', meter: 29600, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-05' },
  { plate: 'EKH-7453', meter: 31009, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-10-07' },
  { plate: 'EKH-7453', meter: 32856, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-04-03' },
  { plate: 'EKH-7453', meter: 33544, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-07-24' },
  { plate: 'EKH-7453', meter: 34045, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-09-09' },
  { plate: 'EKH-7453', meter: 35270, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-06-09' },
  { plate: 'EKH-7453', meter: 35600, service: 'Manutenção', type: 'CORRETIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-07-16' },
  { plate: 'EKH-7453', meter: 36177, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-09-15' },
  { plate: 'EKH-7453', meter: 37500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // EKH-7455
  { plate: 'EKH-7455', meter: 29478, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-07' },
  { plate: 'EKH-7455', meter: 31191, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-11-07' },
  { plate: 'EKH-7455', meter: 32840, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-08' },
  { plate: 'EKH-7455', meter: 34395, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-10-11' },
  { plate: 'EKH-7455', meter: 35736, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-20' },
  { plate: 'EKH-7455', meter: 37548, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-08-12' },
  { plate: 'EKH-7455', meter: 37161, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-20' },
  { plate: 'EKH-7455', meter: 37161, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-27' },
  { plate: 'EKH-7455', meter: 38231, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-03' },
  { plate: 'EKH-7455', meter: 38523, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-14' },
  { plate: 'EKH-7455', meter: 39679, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-04-24' },
  { plate: 'EKH-7455', meter: 40563, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-07-07' },
  { plate: 'EKH-7455', meter: 40621, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-07-09' },
  { plate: 'EKH-7455', meter: 42000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // EKH-7461
  { plate: 'EKH-7461', meter: 25219, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-01-09' },
  { plate: 'EKH-7461', meter: 26971, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-07-18' },
  { plate: 'EKH-7461', meter: 28536, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-28' },
  { plate: 'EKH-7461', meter: 30088, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-31' },
  { plate: 'EKH-7461', meter: 31581, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-14' },
  { plate: 'EKH-7461', meter: 33059, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-07-24' },
  { plate: 'EKH-7461', meter: 34057, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-21' },
  { plate: 'EKH-7461', meter: 34959, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-02-25' },
  { plate: 'EKH-7461', meter: 36100, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-21' },
  { plate: 'EKH-7461', meter: 37126, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-09-15' },
  { plate: 'EKH-7461', meter: 38500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // EKH-7463
  { plate: 'EKH-7463', meter: 28568, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-02-16' },
  { plate: 'EKH-7463', meter: 30302, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-08-04' },
  { plate: 'EKH-7463', meter: 32078, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-15' },
  { plate: 'EKH-7463', meter: 33673, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-08' },
  { plate: 'EKH-7463', meter: 35188, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-06' },
  { plate: 'EKH-7463', meter: 36879, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-26' },
  { plate: 'EKH-7463', meter: 37977, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-10-08' },
  { plate: 'EKH-7463', meter: 38375, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-12' },
  { plate: 'EKH-7463', meter: 39477, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-02-19' },
  { plate: 'EKH-7463', meter: 40375, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-06' },
  { plate: 'EKH-7463', meter: 41523, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-26' },
  { plate: 'EKH-7463', meter: 43000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // EKH-7464
  { plate: 'EKH-7464', meter: 24146, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-02-09' },
  { plate: 'EKH-7464', meter: 25809, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-08-09' },
  { plate: 'EKH-7464', meter: 27570, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-02-11' },
  { plate: 'EKH-7464', meter: 29081, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-12' },
  { plate: 'EKH-7464', meter: 30529, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-15' },
  { plate: 'EKH-7464', meter: 31941, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-20' },
  { plate: 'EKH-7464', meter: 33052, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-09-22' },
  { plate: 'EKH-7464', meter: 34260, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-31' },
  { plate: 'EKH-7464', meter: 35225, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-04-14' },
  { plate: 'EKH-7464', meter: 36123, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-07-08' },
  { plate: 'EKH-7464', meter: 37500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // EKH-7465
  { plate: 'EKH-7465', meter: 2931, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-09-04' },
  { plate: 'EKH-7465', meter: 4500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // EQF-9243 (Acoplado ao Caminhão EKH-9243)
  { plate: 'EQF-9243', meter: 32121, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-16' },
  { plate: 'EQF-9243', meter: 33154, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-11-17' },
  { plate: 'EQF-9243', meter: 33452, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2026-01-27' },
  { plate: 'EQF-9243', meter: 34198, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-06-02' },
  { plate: 'EQF-9243', meter: 35500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },
  // EKH-9243 (Alias de compatibilidade)
  { plate: 'EKH-9243', meter: 32121, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-16' },
  { plate: 'EKH-9243', meter: 33154, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-11-17' },
  { plate: 'EKH-9243', meter: 33452, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2026-01-27' },
  { plate: 'EKH-9243', meter: 34198, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-06-02' },
  { plate: 'EKH-9243', meter: 35500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // EKH-9262
  { plate: 'EKH-9262', meter: 24892, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-02-09' },
  { plate: 'EKH-9262', meter: 26482, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-07-31' },
  { plate: 'EKH-9262', meter: 28270, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-02-11' },
  { plate: 'EKH-9262', meter: 29825, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-18' },
  { plate: 'EKH-9262', meter: 31256, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-06' },
  { plate: 'EKH-9262', meter: 32982, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-22' },
  { plate: 'EKH-9262', meter: 34500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // EKH-9281
  { plate: 'EKH-9281', meter: 25562, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-03-27' },
  { plate: 'EKH-9281', meter: 27284, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-09-08' },
  { plate: 'EKH-9281', meter: 28775, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-02-14' },
  { plate: 'EKH-9281', meter: 30145, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-10' },
  { plate: 'EKH-9281', meter: 31599, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-02' },
  { plate: 'EKH-9281', meter: 33230, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-15' },
  { plate: 'EKH-9281', meter: 34492, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-08' },
  { plate: 'EKH-9281', meter: 33342, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-14' },
  { plate: 'EKH-9281', meter: 34803, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-05' },
  { plate: 'EKH-9281', meter: 35808, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-02-05' },
  { plate: 'EKH-9281', meter: 36711, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-05' },
  { plate: 'EKH-9281', meter: 37557, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-06-22' },
  { plate: 'EKH-9281', meter: 37760, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-07-21' },
  { plate: 'EKH-9281', meter: 39000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // EQF-9424 (Acoplado ao Caminhão TCK-6F97 / EKH-9424)
  { plate: 'EQF-9424', meter: 27847, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-19' },
  { plate: 'EQF-9424', meter: 28977, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-20' },
  { plate: 'EQF-9424', meter: 30204, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-12' },
  { plate: 'EQF-9424', meter: 31175, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-12' },
  { plate: 'EQF-9424', meter: 35763, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-11' },
  { plate: 'EQF-9424', meter: 37416, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-11' },
  { plate: 'EQF-9424', meter: 37451, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-10-10' },
  { plate: 'EQF-9424', meter: 38206, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-21' },
  { plate: 'EQF-9424', meter: 39117, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-25' },
  { plate: 'EQF-9424', meter: 39555, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-06' },
  { plate: 'EQF-9424', meter: 40500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },
  // TCK-6F97 (Alias de compatibilidade do caminhão)
  { plate: 'TCK-6F97', meter: 39555, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-06' },
  // EKH-9424 (Alias de compatibilidade)
  { plate: 'EKH-9424', meter: 27847, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-19' },
  { plate: 'EKH-9424', meter: 28977, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-20' },
  { plate: 'EKH-9424', meter: 30204, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-12' },
  { plate: 'EKH-9424', meter: 31175, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-12' },
  { plate: 'EKH-9424', meter: 35763, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-11' },
  { plate: 'EKH-9424', meter: 37416, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-11' },
  { plate: 'EKH-9424', meter: 37451, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-10-10' },
  { plate: 'EKH-9424', meter: 38206, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-21' },
  { plate: 'EKH-9424', meter: 39117, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-25' },
  { plate: 'EKH-9424', meter: 39555, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-06' },
  { plate: 'EKH-9424', meter: 40500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // EQF-9428 (Acoplado ao Caminhão TCK-6F83 / EKH-9428)
  { plate: 'EQF-9428', meter: 30921, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-08-03' },
  { plate: 'EQF-9428', meter: 32084, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-12-29' },
  { plate: 'EQF-9428', meter: 30597, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-30' },
  { plate: 'EQF-9428', meter: 32074, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-11-27' },
  { plate: 'EQF-9428', meter: 33736, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-07-08' },
  { plate: 'EQF-9428', meter: 33761, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-12' },
  { plate: 'EQF-9428', meter: 39106, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-29' },
  { plate: 'EQF-9428', meter: 40101, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-04' },
  { plate: 'EQF-9428', meter: 41053, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-09-16' },
  { plate: 'EQF-9428', meter: 42500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },
  // TCK-6F83 (Alias de compatibilidade do caminhão)
  { plate: 'TCK-6F83', meter: 41053, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-09-16' },
  // EKH-9428 (Alias de compatibilidade)
  { plate: 'EKH-9428', meter: 30921, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-08-03' },
  { plate: 'EKH-9428', meter: 32084, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-12-29' },
  { plate: 'EKH-9428', meter: 30597, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-30' },
  { plate: 'EKH-9428', meter: 32074, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-11-27' },
  { plate: 'EKH-9428', meter: 33736, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-07-08' },
  { plate: 'EKH-9428', meter: 33761, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-12' },
  { plate: 'EKH-9428', meter: 39106, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-29' },
  { plate: 'EKH-9428', meter: 40101, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-04' },
  { plate: 'EKH-9428', meter: 41053, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-09-16' },
  { plate: 'EKH-9428', meter: 42500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // FFW-5963
  { plate: 'FFW-5963', meter: 15399, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-07-17' },
  { plate: 'FFW-5963', meter: 17166, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-03' },
  { plate: 'FFW-5963', meter: 18913, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-06-10' },
  { plate: 'FFW-5963', meter: 20440, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-11-25' },
  { plate: 'FFW-5963', meter: 21671, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-03-17' },
  { plate: 'FFW-5963', meter: 22949, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-06-17' },
  { plate: 'FFW-5963', meter: 22978, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-08-08' },
  { plate: 'FFW-5963', meter: 22949, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-08-14' },
  { plate: 'FFW-5963', meter: 23931, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-11-10' },
  { plate: 'FFW-5963', meter: 24605, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-01-09' },
  { plate: 'FFW-5963', meter: 24674, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-01-15' },
  { plate: 'FFW-5963', meter: 25064, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-16' },
  { plate: 'FFW-5963', meter: 25807, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-04-13' },
  { plate: 'FFW-5963', meter: 26959, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-07-27' },
  { plate: 'FFW-5963', meter: 28500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // FGA-3945
  { plate: 'FGA-3945', meter: 15427, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-30' },
  { plate: 'FGA-3945', meter: 16995, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-11-27' },
  { plate: 'FGA-3945', meter: 18397, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-08' },
  { plate: 'FGA-3945', meter: 19895, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-09-30' },
  { plate: 'FGA-3945', meter: 21367, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-20' },
  { plate: 'FGA-3945', meter: 21934, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-04-14' },
  { plate: 'FGA-3945', meter: 22266, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-16' },
  { plate: 'FGA-3945', meter: 23622, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-09-20' },
  { plate: 'FGA-3945', meter: 25051, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-09-20' },
  { plate: 'FGA-3945', meter: 25100, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-09-20' },
  { plate: 'FGA-3945', meter: 26751, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-16' },
  { plate: 'FGA-3945', meter: 24982, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-03-11' },
  { plate: 'FGA-3945', meter: 26333, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-21' },
  { plate: 'FGA-3945', meter: 28000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },

  // EQF-6536 (Acoplado ao Caminhão FLZ-6536)
  { plate: 'EQF-6536', meter: 11140, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-14' },
  { plate: 'EQF-6536', meter: 12500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },
  // FLZ-6536 (Alias de compatibilidade)
  { plate: 'FLZ-6536', meter: 11140, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-14' },
  { plate: 'FLZ-6536', meter: 12500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // EQF-0949 (Acoplado ao Caminhão FQL-0949)
  { plate: 'EQF-0949', meter: 11126, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-05' },
  { plate: 'EQF-0949', meter: 12139, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-28' },
  { plate: 'EQF-0949', meter: 13164, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-05-22' },
  { plate: 'EQF-0949', meter: 14134, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-09-23' },
  { plate: 'EQF-0949', meter: 15120, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-13' },
  { plate: 'EQF-0949', meter: 16221, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-14' },
  { plate: 'EQF-0949', meter: 16541, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-15' },
  { plate: 'EQF-0949', meter: 16221, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-27' },
  { plate: 'EQF-0949', meter: 16481, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-09-29' },
  { plate: 'EQF-0949', meter: 16908, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-26' },
  { plate: 'EQF-0949', meter: 17748, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-22' },
  { plate: 'EQF-0949', meter: 18000, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-03' },
  { plate: 'EQF-0949', meter: 19500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },
  // FQL-0949 (Alias de compatibilidade)
  { plate: 'FQL-0949', meter: 11126, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-05' },
  { plate: 'FQL-0949', meter: 12139, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-28' },
  { plate: 'FQL-0949', meter: 13164, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-05-22' },
  { plate: 'FQL-0949', meter: 14134, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-09-23' },
  { plate: 'FQL-0949', meter: 15120, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-13' },
  { plate: 'FQL-0949', meter: 16221, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-14' },
  { plate: 'FQL-0949', meter: 16541, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-15' },
  { plate: 'FQL-0949', meter: 16221, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-27' },
  { plate: 'FQL-0949', meter: 16481, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-09-29' },
  { plate: 'FQL-0949', meter: 16908, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-26' },
  { plate: 'FQL-0949', meter: 17748, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-22' },
  { plate: 'FQL-0949', meter: 18000, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-03' },
  { plate: 'FQL-0949', meter: 19500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // FQQ-0212
  { plate: 'FQQ-0212', meter: 11471, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-03-27' },
  { plate: 'FQQ-0212', meter: 13144, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-09' },
  { plate: 'FQQ-0212', meter: 14648, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-03-07' },
  { plate: 'FQQ-0212', meter: 16089, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-08-14' },
  { plate: 'FQQ-0212', meter: 17519, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-01-06' },
  { plate: 'FQQ-0212', meter: 18553, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-04-15' },
  { plate: 'FQQ-0212', meter: 20053, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-09-04' },
  { plate: 'FQQ-0212', meter: 20443, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-13' },
  { plate: 'FQQ-0212', meter: 21084, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-16' },
  { plate: 'FQQ-0212', meter: 22013, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-04-02' },
  { plate: 'FQQ-0212', meter: 22134, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-04-15' },
  { plate: 'FQQ-0212', meter: 23097, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-07-01' },
  { plate: 'FQQ-0212', meter: 23380, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-06' },
  { plate: 'FQQ-0212', meter: 24500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // FQQ-4043
  { plate: 'FQQ-4043', meter: 23416, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-04-18' },
  { plate: 'FQQ-4043', meter: 25165, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-21' },
  { plate: 'FQQ-4043', meter: 26589, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-02-26' },
  { plate: 'FQQ-4043', meter: 28023, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-11' },
  { plate: 'FQQ-4043', meter: 29471, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-02' },
  { plate: 'FQQ-4043', meter: 30876, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-03-24' },
  { plate: 'FQQ-4043', meter: 31835, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-07-14' },
  { plate: 'FQQ-4043', meter: 32567, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-08-26' },
  { plate: 'FQQ-4043', meter: 32874, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-11-14' },
  { plate: 'FQQ-4043', meter: 33815, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-01-30' },
  { plate: 'FQQ-4043', meter: 34878, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-04-15' },
  { plate: 'FQQ-4043', meter: 35758, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-07-06' },
  { plate: 'FQQ-4043', meter: 36300, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-07-08' },
  { plate: 'FQQ-4043', meter: 37500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // FRF-6972
  { plate: 'FRF-6972', meter: 14267, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-07' },
  { plate: 'FRF-6972', meter: 15936, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-25' },
  { plate: 'FRF-6972', meter: 17362, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-03-26' },
  { plate: 'FRF-6972', meter: 18741, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-10-03' },
  { plate: 'FRF-6972', meter: 20095, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-03-21' },
  { plate: 'FRF-6972', meter: 20640, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-06-21' },
  { plate: 'FRF-6972', meter: 21270, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Goy', executed: 'SIM', date: '2025-08-25' },
  { plate: 'FRF-6972', meter: 22926, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Goy', executed: 'SIM', date: '2026-02-16' },
  { plate: 'FRF-6972', meter: 24070, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-19' },
  { plate: 'FRF-6972', meter: 25500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // FSJ-4324
  { plate: 'FSJ-4324', meter: 22896, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-07-26' },
  { plate: 'FSJ-4324', meter: 24522, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-12-15' },
  { plate: 'FSJ-4324', meter: 25994, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-05-20' },
  { plate: 'FSJ-4324', meter: 27515, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-15' },
  { plate: 'FSJ-4324', meter: 2317, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-04-21' },
  { plate: 'FSJ-4324', meter: 2995, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-07-17' },
  { plate: 'FSJ-4324', meter: 3076, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-07-18' },
  { plate: 'FSJ-4324', meter: 3862, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-12-09' },
  { plate: 'FSJ-4324', meter: 5458, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-07' },
  { plate: 'FSJ-4324', meter: 7000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },

  // FWL-8547
  { plate: 'FWL-8547', meter: 19568, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2026-07-03' },
  { plate: 'FWL-8547', meter: 19800, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2026-08-27' },
  { plate: 'FWL-8547', meter: 21000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // FRH-1171
  { plate: 'FRH-1171', meter: 11272, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-04-20' },
  { plate: 'FRH-1171', meter: 12920, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-11' },
  { plate: 'FRH-1171', meter: 14478, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-03-11' },
  { plate: 'FRH-1171', meter: 15932, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-17' },
  { plate: 'FRH-1171', meter: 17496, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-11' },
  { plate: 'FRH-1171', meter: 18968, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-05-22' },
  { plate: 'FRH-1171', meter: 19465, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-07-25' },
  { plate: 'FRH-1171', meter: 20048, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-07-28' },
  { plate: 'FRH-1171', meter: 20048, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-10-02' },
  { plate: 'FRH-1171', meter: 20497, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-18' },
  { plate: 'FRH-1171', meter: 21015, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-18' },
  { plate: 'FRH-1171', meter: 21296, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-30' },
  { plate: 'FRH-1171', meter: 22357, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-04-17' },
  { plate: 'FRH-1171', meter: 23400, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-07-08' },
  { plate: 'FRH-1171', meter: 24500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // GDM-4926
  { plate: 'GDM-4926', meter: 17358, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-08-03' },
  { plate: 'GDM-4926', meter: 19149, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-28' },
  { plate: 'GDM-4926', meter: 20708, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-06-16' },
  { plate: 'GDM-4926', meter: 22202, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-11-21' },
  { plate: 'GDM-4926', meter: 23566, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-04-08' },
  { plate: 'GDM-4926', meter: 23566, service: 'Manutenção', type: 'CORRETIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-08-27' },
  { plate: 'GDM-4926', meter: 28752, service: 'Manutenção', type: 'CORRETIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-10-13' },
  { plate: 'GDM-4926', meter: 25670, service: 'Manutenção', type: 'CORRETIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-10-14' },
  { plate: 'GDM-4926', meter: 26300, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-01-26' },
  { plate: 'GDM-4926', meter: 27069, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-03-31' },
  { plate: 'GDM-4926', meter: 27516, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-04' },
  { plate: 'GDM-4926', meter: 28000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-08-27' },
  { plate: 'GDM-4926', meter: 29500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // GDS-1002
  { plate: 'GDS-1002', meter: 19099, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-04-19' },
  { plate: 'GDS-1002', meter: 20597, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-30' },
  { plate: 'GDS-1002', meter: 22162, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-05' },
  { plate: 'GDS-1002', meter: 23584, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-09-11' },
  { plate: 'GDS-1002', meter: 25053, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-17' },
  { plate: 'GDS-1002', meter: 26717, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-07-31' },
  { plate: 'GDS-1002', meter: 27469, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-11-03' },
  { plate: 'GDS-1002', meter: 28172, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-01-13' },
  { plate: 'GDS-1002', meter: 29191, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-04-23' },
  { plate: 'GDS-1002', meter: 30518, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-09-03' },
  { plate: 'GDS-1002', meter: 32000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'NÃO', date: '' },

  // GDY-1637
  { plate: 'GDY-1637', meter: 20159, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-26' },
  { plate: 'GDY-1637', meter: 21684, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-10-26' },
  { plate: 'GDY-1637', meter: 23269, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-04' },
  { plate: 'GDY-1637', meter: 24891, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-04-04' },
  { plate: 'GDY-1637', meter: 26383, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-02-10' },
  { plate: 'GDY-1637', meter: 27929, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-06-17' },
  { plate: 'GDY-1637', meter: 28453, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-14' },
  { plate: 'GDY-1637', meter: 28453, service: 'Manutenção', type: 'CORRETIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-08-27' },
  { plate: 'GDY-1637', meter: 28795, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-08-25' },
  { plate: 'GDY-1637', meter: 30070, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-11' },
  { plate: 'GDY-1637', meter: 31329, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-22' },
  { plate: 'GDY-1637', meter: 32250, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-26' },
  { plate: 'GDY-1637', meter: 32399, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-09-17' },
  { plate: 'GDY-1637', meter: 34000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },

  // EQF-2I15 (Acoplado ao Caminhão GFT-2I15)
  { plate: 'EQF-2I15', meter: 15079, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-29' },
  { plate: 'EQF-2I15', meter: 16500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },
  // GFT-2I15 (Alias de compatibilidade)
  { plate: 'GFT-2I15', meter: 15079, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-05-29' },
  { plate: 'GFT-2I15', meter: 16500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // EQF-2431 (Acoplado ao Caminhão GJM-2431)
  { plate: 'EQF-2431', meter: 8903, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-25' },
  { plate: 'EQF-2431', meter: 10556, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-28' },
  { plate: 'EQF-2431', meter: 11603, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-03' },
  { plate: 'EQF-2431', meter: 12477, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-11-18' },
  { plate: 'EQF-2431', meter: 13455, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-04-04' },
  { plate: 'EQF-2431', meter: 14275, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-13' },
  { plate: 'EQF-2431', meter: 14275, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-27' },
  { plate: 'EQF-2431', meter: 15299, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-23' },
  { plate: 'EQF-2431', meter: 15552, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-02-25' },
  { plate: 'EQF-2431', meter: 16186, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-06-19' },
  { plate: 'EQF-2431', meter: 17500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },
  // GJM-2431 (Alias de compatibilidade)
  { plate: 'GJM-2431', meter: 8903, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-05-25' },
  { plate: 'GJM-2431', meter: 10556, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-01-28' },
  { plate: 'GJM-2431', meter: 11603, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-07-03' },
  { plate: 'GJM-2431', meter: 12477, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-11-18' },
  { plate: 'GJM-2431', meter: 13455, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-04-04' },
  { plate: 'GJM-2431', meter: 14275, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-13' },
  { plate: 'GJM-2431', meter: 14275, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-08-27' },
  { plate: 'GJM-2431', meter: 15299, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-01-23' },
  { plate: 'GJM-2431', meter: 15552, service: 'Manutenção', type: 'CORRETIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-02-25' },
  { plate: 'GJM-2431', meter: 16186, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-06-19' },
  { plate: 'GJM-2431', meter: 17500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // GJX-2504
  { plate: 'GJX-2504', meter: 12244, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-02-03' },
  { plate: 'GJX-2504', meter: 13711, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2023-08-21' },
  { plate: 'GJX-2504', meter: 15497, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-02-11' },
  { plate: 'GJX-2504', meter: 16998, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-02-11' },
  { plate: 'GJX-2504', meter: 18393, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2024-12-02' },
  { plate: 'GJX-2504', meter: 19688, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-04-15' },
  { plate: 'GJX-2504', meter: 21160, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-09-12' },
  { plate: 'GJX-2504', meter: 21297, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-10-17' },
  { plate: 'GJX-2504', meter: 21719, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-17' },
  { plate: 'GJX-2504', meter: 21751, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2025-11-19' },
  { plate: 'GJX-2504', meter: 22652, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-02-09' },
  { plate: 'GJX-2504', meter: 23100, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-04-08' },
  { plate: 'GJX-2504', meter: 24755, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-08-13' },
  { plate: 'GJX-2504', meter: 25000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'SIM', date: '2026-09-03' },
  { plate: 'GJX-2504', meter: 26500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Videfrigo', executed: 'NÃO', date: '' },

  // TKE-1H73
  { plate: 'TKE-1H73', meter: 1497, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2025-06-30' },
  { plate: 'TKE-1H73', meter: 3208, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-02-09' },
  { plate: 'TKE-1H73', meter: 4500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'NÃO', date: '' },

  // TKP-4I92
  { plate: 'TKP-4I92', meter: 1564, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2025-08-05' },
  { plate: 'TKP-4I92', meter: 2842, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-02-20' },
  { plate: 'TKP-4I92', meter: 3958, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-05-18' },
  { plate: 'TKP-4I92', meter: 5200, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'NÃO', date: '' },

  // TKI-5D20
  { plate: 'TKI-5D20', meter: 1607, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2025-09-02' },
  { plate: 'TKI-5D20', meter: 2690, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-02-21' },
  { plate: 'TKI-5D20', meter: 4180, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-06-30' },
  { plate: 'TKI-5D20', meter: 5500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'NÃO', date: '' },

  // TKE-2H65
  { plate: 'TKE-2H65', meter: 2770, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-02-21' },
  { plate: 'TKE-2H65', meter: 5000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'NÃO', date: '' },

  // TJJ-8D10
  { plate: 'TJJ-8D10', meter: 1463, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2025-09-05' },
  { plate: 'TJJ-8D10', meter: 2671, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-02-23' },
  { plate: 'TJJ-8D10', meter: 5000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'NÃO', date: '' },

  // SUS-7I12
  { plate: 'SUS-7I12', meter: 1777, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2025-06-06' },
  { plate: 'SUS-7I12', meter: 2489, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Munique', executed: 'SIM', date: '2026-01-27' },
  { plate: 'SUS-7I12', meter: 3592, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-05-11' },
  { plate: 'SUS-7I12', meter: 4800, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'NÃO', date: '' },

  // TKI-1A27
  { plate: 'TKI-1A27', meter: 3310, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-01-09' },
  { plate: 'TKI-1A27', meter: 5241, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'SIM', date: '2026-06-30' },
  { plate: 'TKI-1A27', meter: 6500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'Vamos', executed: 'NÃO', date: '' },

  // EQF-8793 (Acoplado ao Caminhão FSJ-8793)
  { plate: 'EQF-8793', meter: 41819, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-04-09' },
  { plate: 'EQF-8793', meter: 42798, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-09-29' },
  { plate: 'EQF-8793', meter: 43573, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-01-22' },
  { plate: 'EQF-8793', meter: 43694, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-13' },
  { plate: 'EQF-8793', meter: 44519, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-06-19' },
  { plate: 'EQF-8793', meter: 46000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },
  // FSJ-8793 (Alias de compatibilidade)
  { plate: 'FSJ-8793', meter: 41819, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-04-09' },
  { plate: 'FSJ-8793', meter: 42798, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-09-29' },
  { plate: 'FSJ-8793', meter: 43573, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-01-22' },
  { plate: 'FSJ-8793', meter: 43694, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-13' },
  { plate: 'FSJ-8793', meter: 44519, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-06-19' },
  { plate: 'FSJ-8793', meter: 46000, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },

  // EQF-6361 (Acoplado ao Caminhão FSN-6361)
  { plate: 'EQF-6361', meter: 4775, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-10-16' },
  { plate: 'EQF-6361', meter: 4790, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-11-26' },
  { plate: 'EQF-6361', meter: 5404, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-24' },
  { plate: 'EQF-6361', meter: 6800, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },
  // FSN-6361 (Alias de compatibilidade)
  { plate: 'FSN-6361', meter: 4775, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-10-16' },
  { plate: 'FSN-6361', meter: 4790, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2025-11-26' },
  { plate: 'FSN-6361', meter: 5404, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-24' },
  { plate: 'FSN-6361', meter: 6800, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },

  // FNM-6G51
  { plate: 'FNM-6G51', meter: 2908, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'SIM', date: '2026-02-24' },
  { plate: 'FNM-6G51', meter: 4500, service: 'Manutenção', type: 'PREVENTIVA', workshop: 'VideFrigo', executed: 'NÃO', date: '' },
];

export const TK_REVISIONS_HISTORY: MaintenanceRecord[] = RAW_TK_REVISIONS.map((item, index) => {
  const isSim = item.executed === 'SIM';
  const displayDate = isSim ? item.date : '2026-09-17';
  const isPreventiva = item.type === 'PREVENTIVA';

  return {
    id: `hist-tk-${String(index + 1).padStart(3, '0')}`,
    vehicleId: `veh-tk-${item.plate}`,
    plate: item.plate,
    vehicleType: 'tk',
    date: displayDate,
    revisionType: isPreventiva ? 'PREVENTIVA TK (1.500 HORAS)' : 'CORRETIVA SISTEMA DE REFRIGERAÇÃO',
    meterReading: item.meter,
    workshop: item.workshop,
    technician: isSim ? `Técnico Frigorífico (${item.workshop})` : 'Aguardando Atendimento',
    cost: isSim ? (isPreventiva ? 2600 : 3800) : 0,
    executionStatus: item.executed as 'SIM' | 'NÃO',
    executed: isSim,
    nextScheduledMeter: isSim ? item.meter + 1500 : item.meter,
    notes: isSim
      ? `${item.type === 'PREVENTIVA' ? 'Manutenção Preventiva' : 'Manutenção Corretiva'} realizada na oficina ${item.workshop} com ${item.meter.toLocaleString('pt-BR')} Horas.`
      : `Manutenção Preventiva de Thermo King programada para a meta de ${item.meter.toLocaleString('pt-BR')} Horas (Oficina ${item.workshop} - Aguardando Atendimento).`,
    partsReplaced: isSim
      ? isPreventiva
        ? ['Óleo Sintético Thermo King', 'Filtro de Óleo Diesel', 'Filtro de Ar de Alta Eficiência', 'Correia do Alternador e Compressor', 'Inspeção do Gás R-404A/R-452A']
        : ['Válvula de expansão', 'Carga de gás refrigerante', 'Sensor de temperatura', 'Teste de estanqueidade e vácuo']
      : [],
  };
});

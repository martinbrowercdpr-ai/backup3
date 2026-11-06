export type VehicleType = 'cavalo' | 'carreta' | 'tk';

export type AlertLevel = 'ok' | 'warning' | 'critical';

// Tipos de revisão específicos solicitados pelo usuário
export type CavaloRevisionType = 'REVISAO X' | 'REVISAO S' | 'REVISAO L' | 'REVISAO M';
export type CarretaRevisionType =
  | 'PREVENTIVA DE FREIOS (60.000 KM)'
  | 'PREVENTIVA DE FREIOS (50.000 KM)'
  | 'PREVENTIVA DE FREIOS (30.000 KM)'
  | 'MANUTENÇÃO DE FREIOS (30.000 KM)'
  | 'CORRETIVA/GERAL DE FREIOS (50.000 KM)'
  | 'REVISAO GERAL FREIOS'
  | 'REVISÃO PREVENTIVA (TARA 30.000 KM)'
  | 'REVISÃO GERAL (TARA 50.000 KM)';
export type TkRevisionType =
  | 'MANUTENÇÃO PREVENTIVA'
  | 'MANUTENÇÃO CORRETIVA'
  | 'PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO'
  | 'PREVENTIVA TK (1.000 HORAS)'
  | 'PREVENTIVA TK (1.500 HORAS)';

export type RevisionType = CavaloRevisionType | CarretaRevisionType | TkRevisionType | string;

export interface InvoiceAttachment {
  name: string;
  size: number;
  type: string; // 'application/pdf', 'image/png', 'image/jpeg', etc.
  dataUrl: string; // Base64 data URI
  uploadedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  plate: string;
  vehicleType: VehicleType;
  date: string; // YYYY-MM-DD
  revisionType: RevisionType;
  meterReading: number; // KM or Hours at maintenance
  workshop: string;
  technician?: string;
  cost?: number;
  partsReplaced?: string[];
  notes?: string;
  nextScheduledMeter: number;
  
  // Status de execução da revisão na concessionária (SIM = Realizada, NÃO = Programada/Pendente)
  executionStatus?: 'SIM' | 'NÃO';
  executed?: boolean;

  // Anexo de Nota Fiscal / Relatório em PDF ou Imagem
  invoiceAttachment?: InvoiceAttachment;
  invoiceNumber?: string;

  // Se a revisão programada possui controle temporal de 8 meses
  isTimeBasedRevision?: boolean;
  nextScheduledDate?: string;
}

export interface Vehicle {
  id: string;
  plate: string; // Placa (ex: BRA2E19 ou ABC-1234)
  fleetNumber: string; // Prefixo / Número de Frota (ex: CAV-102, CRT-405, TK-01)
  type: VehicleType;
  model: string;
  brand: string;
  year: number;
  
  // Medidor atual (KM para cavalo/carreta, Horas de motor/diesel para TK)
  currentMeter: number;
  meterUnit: 'KM' | 'HORAS';
  
  // Dados da última manutenção realizada
  lastMaintenanceDate: string;
  lastMaintenanceType: RevisionType;
  lastMaintenanceMeter: number;
  
  // Próxima revisão prevista por medição (KM/Horas)
  nextRevisionType: RevisionType;
  nextRevisionMeter: number;
  
  // Regra especial para Cavalos com controle por MÊS (Tara de 8 Meses)
  isTimeBasedRevision?: boolean;
  timeBasedIntervalMonths?: number; // 8 meses
  nextRevisionDate?: string; // YYYY-MM-DD calculada
  cavaloTaraKm?: number; // Trava customizada de KM rodados (padrão 40.000 KM com alerta intermediário aos 20.000 KM)
  
  // Regra especial para TKs com ciclo de 500 Horas ou 1.000 Horas (Troca de Filtros)
  isTk500hFilterRule?: boolean;
  isTk1000hFilterRule?: boolean;

  // Regra especial para Carretas com Trava de 60.000 KM (Atenção com 50.000 KM)
  carretaTaraKm?: 30000 | 50000 | 60000 | number;
  kmSinceLastMaintenance?: number;

  // Porte da Carroceria / Equipamento e Configuração de Eixos
  bodySize?: 'PEQUENA' | 'GRANDE' | 'BITRUCK' | 'TRUCK' | 'VUC' | string;
  axlesConfig?: '2 EIXOS' | '3 EIXOS' | 'TOCO' | string;
  
  // Associação operacional (ex: cavalo engatado na carreta X e TK Y)
  coupledCarretaPlate?: string;
  coupledTkPlate?: string;
  
  status: 'active' | 'maintenance' | 'inactive';
  observations?: string;
  updatedAt: string;
}

export interface FleetAlert {
  vehicleId: string;
  plate: string;
  fleetNumber: string;
  type: VehicleType;
  level: AlertLevel;
  nextRevisionType: RevisionType;
  currentMeter: number;
  targetMeter: number;
  difference: number; // Negativo se vencido, positivo se restante
  percentUsed: number;
  unit: 'KM' | 'HORAS';
  message: string;
  
  // Alertas temporais (Regra dos 8 Meses)
  isTimeBased?: boolean;
  targetDate?: string;
  daysRemaining?: number;
  monthsRemaining?: number;
  daysSinceLast?: number; // Dias decorridos desde a última manutenção registrada

  // Regra TK Filtro (500h / 1.000h)
  isTk500hFilterRule?: boolean;
  isTk1000hFilterRule?: boolean;

  // Regra Carreta Tara 30K / 50K
  carretaTaraKm?: number;
  kmSinceLastMaintenance?: number;
}

export interface FilterOptions {
  search: string;
  type: 'all' | VehicleType;
  alertLevel: 'all' | AlertLevel;
  status: 'all' | 'active' | 'maintenance' | 'inactive';
  sortBy: 'urgency' | 'plate' | 'meter' | 'nextRevision';
  sortDirection: 'asc' | 'desc';
}

export interface RouteSheetEntry {
  id: string;
  date: string;          // Ex: "15/09/2026"
  month: number;         // Ex: 9
  year: string;          // Ex: "set/26"
  week: number;          // Ex: 38
  route: string;         // Ex: "TRRS22"
  cavaloPlate: string;   // Ex: "EZL-0857"
  carretaPlate: string;  // Ex: "TKP-4I92"
  odometerStart: number; // Ex: 856215
  odometerEnd: number;   // Ex: 857738
  litersCavalo: number;  // Ex: 411
  horimeterStart: number;// Ex: 4832
  horimeterEnd: number;  // Ex: 4843
  litersTk: number;      // Ex: 31
  totalKm: number;       // Ex: 1523 (odometerEnd - odometerStart)
  totalHours: number;    // Ex: 11 (horimeterEnd - horimeterStart)
  notes?: string;
}

export type ChangeLogType = 'meter_update' | 'maintenance_performed' | 'batch_sync';

export interface ChangeLogEntry {
  id: string;
  timestamp: string;      // ISO string
  dateStr: string;        // DD/MM/AAAA
  timeStr: string;        // HH:MM
  type: ChangeLogType;
  vehicleId?: string;
  plate: string;
  vehicleType: VehicleType;
  performedBy: string;    // Quem realizou: Mecânico, Técnico ou Operador
  action: string;         // Resumo da alteração
  previousValue?: number;
  newValue?: number;
  difference?: number;
  unit?: 'KM' | 'HORAS';
  workshop?: string;
  notes?: string;
}

export interface AbastecimentoSyncEntry {
  id: string;
  plate: string;
  cleanPlate: string;
  vehicleType: VehicleType;
  previousMeter: number;
  newMeter: number;
  diffMeter: number;
  unit: 'KM' | 'HORAS';
  timestamp: string;
  dateStr: string;
  timeStr: string;
  sourceDatabaseId: string;
  targetDatabaseId: string;
  status: 'success' | 'warning' | 'error';
  performedBy?: string;
  frentista?: string;
  posto?: string;
  litros?: number;
  combustivel?: string;
  message?: string;
}


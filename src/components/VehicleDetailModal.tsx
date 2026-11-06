import React, { useState, useMemo } from 'react';
import {
  X,
  Truck,
  Container,
  Snowflake,
  Gauge,
  Clock,
  Wrench,
  Calendar,
  DollarSign,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  FileText,
  Paperclip,
  Eye,
  Receipt,
  ClipboardList,
  UserCheck,
  Lock,
  Edit3,
} from 'lucide-react';
import { Vehicle, MaintenanceRecord, InvoiceAttachment, ChangeLogEntry } from '../types';
import {
  calculateAlert,
  getAlertBadgeClasses,
  formatMeter,
  getVehicleTypeLabel,
  isTimeBasedCavalo,
  isVehicleTimeBased,
  isTkFilter500hPlate,
  isCarreta30k,
  isCarreta50k,
  getCarretaIntervalKm,
  formatDatePtBr,
  addMonthsToDate,
} from '../utils/maintenanceCalculations';
import { SCANIA_REVISIONS_CATALOG, ScaniaRevisionDetail } from '../data/scaniaRevisionCatalog';
import { InvoiceViewerModal } from './InvoiceViewerModal';
import { VehicleMeterHistoryChart } from './VehicleMeterHistoryChart';
import { EditMaintenanceRecordModal } from './EditMaintenanceRecordModal';
import {
  reconcileVehiclesWithHistory,
  inferRecordVehicleType,
  parseDateScore,
} from '../utils/maintenanceForecasting';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  history: MaintenanceRecord[];
  allVehicles: Vehicle[];
  changeLogs?: ChangeLogEntry[];
  onClose: () => void;
  onOpenUpdateMeter: (vehicle: Vehicle) => void;
  onOpenRegisterMaintenance: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onDeleteHistoryRecord?: (recordId: string) => void;
  onUpdateHistoryRecord?: (updatedRecord: MaintenanceRecord) => void;
  onUpdateVehicle?: (updatedVehicle: Vehicle) => void;
  onClearTkHistory?: () => void;
  onOpenRevisionCatalog?: (tab?: 'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO') => void;
  onToggleTimeBased?: (plate: string, enable?: boolean) => void;
  onUpdateCavaloTaraKm?: (plateOrAll: string | 'ALL', newTaraKm: number) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle: initialVehicle,
  history,
  allVehicles,
  changeLogs = [],
  onClose,
  onOpenUpdateMeter,
  onOpenRegisterMaintenance,
  onDeleteVehicle,
  onDeleteHistoryRecord,
  onUpdateHistoryRecord,
  onUpdateVehicle,
  onClearTkHistory,
  onOpenRevisionCatalog,
  onToggleTimeBased,
  onUpdateCavaloTaraKm,
}) => {
  // Sempre sincroniza o veículo exibido no modal com a última revisão executada no histórico
  const activeVehicle = useMemo(() => {
    if (!initialVehicle) return null;
    const reconciled = reconcileVehiclesWithHistory([initialVehicle], history);
    return reconciled[0] || initialVehicle;
  }, [initialVehicle, history]);

  const vehicle = activeVehicle || initialVehicle;

  // Propaga atualização da reconciliação com a nuvem/estado caso haja divergência
  React.useEffect(() => {
    if (!activeVehicle || !initialVehicle || !onUpdateVehicle) return;
    const isDifferent =
      activeVehicle.lastMaintenanceDate !== initialVehicle.lastMaintenanceDate ||
      activeVehicle.lastMaintenanceMeter !== initialVehicle.lastMaintenanceMeter ||
      activeVehicle.nextRevisionMeter !== initialVehicle.nextRevisionMeter ||
      activeVehicle.currentMeter !== initialVehicle.currentMeter;

    if (isDifferent) {
      onUpdateVehicle(activeVehicle);
    }
  }, [activeVehicle, initialVehicle, onUpdateVehicle]);
  const [activeInvoice, setActiveInvoice] = useState<{
    attachment: InvoiceAttachment;
    invoiceNumber?: string;
    plate?: string;
    revisionType?: string;
  } | null>(null);

  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isConfirmingDeleteVehicle, setIsConfirmingDeleteVehicle] = useState<boolean>(false);
  const [isConfirmingClearTk, setIsConfirmingClearTk] = useState<boolean>(false);

  // Estados para edição da última revisão e registros de manutenção
  const [isEditingLastRev, setIsEditingLastRev] = useState<boolean>(false);
  const [editLastRevDate, setEditLastRevDate] = useState<string>('');
  const [editLastRevMeter, setEditLastRevMeter] = useState<number>(0);
  const [editLastRevType, setEditLastRevType] = useState<string>('');
  const [editNextRevType, setEditNextRevType] = useState<string>('');
  const [editNextRevMeter, setEditNextRevMeter] = useState<number>(0);
  const [editingHistoryRecord, setEditingHistoryRecord] = useState<MaintenanceRecord | null>(null);

  if (!vehicle) return null;

  const handleAttachToExisting = (record: MaintenanceRecord, file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
            const updated: MaintenanceRecord = {
              ...record,
              invoiceAttachment: {
                name: file.name.replace(/\.[^.]+$/, '.jpg'),
                size: Math.round((compressedDataUrl.length * 3) / 4),
                type: 'image/jpeg',
                dataUrl: compressedDataUrl,
                uploadedAt: new Date().toISOString(),
              },
            };
            onUpdateHistoryRecord?.(updated);
            return;
          }
          const updated: MaintenanceRecord = {
            ...record,
            invoiceAttachment: {
              name: file.name,
              size: file.size,
              type: file.type || 'image/jpeg',
              dataUrl: e.target?.result as string,
              uploadedAt: new Date().toISOString(),
            },
          };
          onUpdateHistoryRecord?.(updated);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const updated: MaintenanceRecord = {
          ...record,
          invoiceAttachment: {
            name: file.name,
            size: file.size,
            type: file.type || 'application/pdf',
            dataUrl,
            uploadedAt: new Date().toISOString(),
          },
        };
        onUpdateHistoryRecord?.(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const alert = calculateAlert(vehicle);
  const badge = getAlertBadgeClasses(alert.level);
  const isHours = vehicle.meterUnit === 'HORAS';
  const isTimeBased = isVehicleTimeBased(vehicle);

  // Histórico filtrado para este veículo específico (com validação estrita de tipo de veículo)
  const cleanPlateStr = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  const vPlateClean = cleanPlateStr(vehicle.plate);

  const vehicleHistory = useMemo(() => {
    return history
      .filter((h) => {
        const matchesId = h.vehicleId === vehicle.id;
        const hPlateClean = cleanPlateStr(h.plate);
        const matchesPlate = Boolean(vPlateClean && hPlateClean === vPlateClean);
        if (!matchesId && !matchesPlate) return false;

        const hType = inferRecordVehicleType(h);
        if (hType && vehicle.type && hType !== vehicle.type) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeDiff = parseDateScore(b.date) - parseDateScore(a.date);
        if (timeDiff !== 0) return timeDiff;
        return (b.meterReading || 0) - (a.meterReading || 0);
      });
  }, [history, vehicle.id, vehicle.plate, vehicle.type, vPlateClean]);

  // Logs de alteração específicos desta unidade (KM, horas e responsáveis)
  const vehicleLogs = useMemo(() => {
    return changeLogs.filter(
      (l) => (l.vehicleType ? l.vehicleType === vehicle.type : true) &&
             (cleanPlateStr(l.plate) === vPlateClean || l.vehicleId === vehicle.id)
    );
  }, [changeLogs, vehicle.type, vPlateClean, vehicle.id]);

  const totalSpent = vehicleHistory.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  const getTypeIcon = () => {
    switch (vehicle.type) {
      case 'cavalo':
        return <Truck className="w-5 h-5 text-sky-400" />;
      case 'carreta':
        return <Container className="w-5 h-5 text-amber-400" />;
      case 'tk':
        return <Snowflake className="w-5 h-5 text-cyan-400" />;
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    if (onDeleteHistoryRecord) {
      onDeleteHistoryRecord(recordId);
      setRecordToDelete(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="glass-panel border border-slate-700/70 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-950/85 backdrop-blur-md border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-md">
                {getTypeIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black font-mono tracking-wider text-white">
                    {vehicle.plate}
                  </h2>
                  {vehicle.fleetNumber &&
                    vehicle.fleetNumber !== vehicle.plate &&
                    !/^(CAV|TK|CRT)-\d+/i.test(vehicle.fleetNumber) && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {vehicle.fleetNumber}
                      </span>
                    )}
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {getVehicleTypeLabel(vehicle.type)}
                  </span>
                  {isTimeBased ? (
                    <button
                      type="button"
                      onClick={() => onToggleTimeBased?.(vehicle.plate, false)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/25 hover:bg-rose-900/40 text-purple-300 hover:text-rose-300 border border-purple-500/40 hover:border-rose-500/40 transition cursor-pointer flex items-center gap-1"
                      title="Clique para desmarcar a regra de 8 meses para esta placa"
                    >
                      <span>⏱️ Tara 8 Meses</span>
                      <span className="text-[9px] opacity-75">(Desmarcar)</span>
                    </button>
                  ) : vehicle.type === 'cavalo' ? (
                    <button
                      type="button"
                      onClick={() => onToggleTimeBased?.(vehicle.plate, true)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-purple-900/40 text-slate-400 hover:text-purple-300 border border-slate-700 hover:border-purple-500/40 transition cursor-pointer flex items-center gap-1"
                      title="Clique para aplicar a regra de 8 meses para esta placa"
                    >
                      <span>+ Ativar 8 Meses</span>
                    </button>
                  ) : null}
                  {vehicle.type === 'carreta' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-500/25 text-amber-300 border-amber-500/40">
                      🔒 Trava {(vehicle.carretaTaraKm || 60000).toLocaleString('pt-BR')} KM (Atenção aos 50K)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {vehicle.type === 'cavalo'
                    ? `Cavalo Mecânico • Ano ${vehicle.year}`.trim()
                    : vehicle.type === 'tk'
                    ? `Thermo King • ${vehicle.bodySize || 'Refrigeração'}${vehicle.axlesConfig ? ` • ${vehicle.axlesConfig}` : ''}`
                    : `Carreta / Semirreboque • ${vehicle.bodySize || ''}${vehicle.axlesConfig ? ` • ${vehicle.axlesConfig}` : ''}`.trim()}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
            {/* Banner de Alerta e Status */}
            <div
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${badge.bg} ${badge.border}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-current mt-1 shrink-0 animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${badge.text}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">• {alert.message}</span>
                  </div>
                  <p className="text-[11px] text-slate-300/80 mt-0.5">
                    Próxima intervenção:{' '}
                    <strong className="text-white font-bold">{vehicle.nextRevisionType}</strong>
                    {isTimeBased && vehicle.nextRevisionDate && (
                      <span className="ml-2 font-mono text-purple-300 font-bold">
                        (Vencimento: {formatDatePtBr(vehicle.nextRevisionDate)})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">{isTimeBased ? 'Prazo de Vencimento' : 'Saldo Restante'}</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    isTimeBased
                      ? alert.daysRemaining !== undefined && alert.daysRemaining <= 0
                        ? 'text-rose-400'
                        : alert.daysRemaining !== undefined && alert.daysRemaining <= 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                      : alert.difference <= 0
                      ? 'text-rose-400'
                      : alert.difference <= 2500
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {isTimeBased
                    ? alert.daysRemaining !== undefined && alert.daysRemaining <= 0
                      ? `VENCIDA (${Math.abs(alert.daysRemaining)} dias)`
                      : `${alert.daysRemaining ?? 0} dias rest.`
                    : alert.difference <= 0
                    ? 'VENCIDA'
                    : formatMeter(alert.difference, vehicle.meterUnit)}
                </span>
              </div>
            </div>

            {/* Cartões Rápidos de Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block flex items-center gap-1 mb-1">
                  <Gauge className="w-3 h-3 text-sky-400" />
                  {isHours ? 'Horímetro Atual' : 'KM Atual'}
                </span>
                <span className="font-mono font-bold text-sm text-white">
                  {formatMeter(vehicle.currentMeter, vehicle.meterUnit)}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block flex items-center gap-1 mb-1">
                  <Wrench className="w-3 h-3 text-amber-400" />
                  Meta Programada
                </span>
                <span className="font-mono font-bold text-sm text-amber-400">
                  {vehicle.type === 'carreta'
                    ? `${(vehicle.carretaTaraKm || 60000).toLocaleString('pt-BR')} KM`
                    : formatMeter(vehicle.nextRevisionMeter, vehicle.meterUnit)}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Última Manutenção
                  </span>
                  {onUpdateVehicle && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditLastRevDate(vehicle.lastMaintenanceDate || '');
                        setEditLastRevMeter(vehicle.lastMaintenanceMeter || 0);
                        setEditLastRevType(vehicle.lastMaintenanceType || 'REVISAO S');
                        setEditNextRevType(vehicle.nextRevisionType || 'REVISAO X');
                        setEditNextRevMeter(vehicle.nextRevisionMeter || 0);
                        setIsEditingLastRev(true);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition cursor-pointer flex items-center gap-1"
                      title="Editar data ou odômetro da última revisão"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-200 block truncate">
                  {vehicle.lastMaintenanceType}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {formatDatePtBr(vehicle.lastMaintenanceDate)}
                </span>
                {alert.daysSinceLast !== undefined && (
                  <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                    {alert.daysSinceLast} dias decorridos
                  </span>
                )}
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block flex items-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  Total Gasto
                </span>
                <span className="font-mono font-bold text-xs text-emerald-400">
                  R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {vehicleHistory.length} intervenções
                </span>
              </div>
            </div>

            {/* Vínculo Operacional (Caminhão <-> TK / Carreta) */}
            {(vehicle.coupledTkPlate || vehicle.coupledCarretaPlate) && (
              <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {vehicle.type === 'cavalo' ? (
                    <Snowflake className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      {vehicle.type === 'cavalo' ? 'Thermo King Vinculado:' : 'Caminhão / Cavalo Vinculado:'}
                    </span>
                    <span className="ml-2 font-mono font-black text-sm text-cyan-300">
                      {vehicle.type === 'cavalo' ? vehicle.coupledTkPlate : (vehicle.coupledCarretaPlate || vehicle.coupledTkPlate)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                  Conjunto Operacional
                </span>
              </div>
            )}

            {/* Painel Especial Cavalo 8 Meses: Controle por Data (Não por KM) */}
            {vehicle.type === 'cavalo' && isTimeBased && (
              <div className="p-3.5 bg-gradient-to-r from-purple-950/40 to-slate-900 rounded-xl border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⏱️</span>
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                      Regra de Vencimento por Data (8 Meses) • Não Vence por KM
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Controle por Data
                    </span>
                    {onToggleTimeBased && (
                      <button
                        type="button"
                        onClick={() => onToggleTimeBased(vehicle.plate, false)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 transition cursor-pointer flex items-center gap-1 shadow-xs"
                        title="Desmarcar regra de 8 meses e retornar ao ciclo padrão de KM (Trava 40k)"
                      >
                        <span>✕ Desmarcar 8 Meses</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Última Revisão</span>
                    <span className="font-mono font-black text-xs text-white">
                      {formatDatePtBr(vehicle.lastMaintenanceDate)}
                    </span>
                    {alert.daysSinceLast !== undefined && (
                      <span className="text-[9px] text-purple-400 block mt-0.5">há {alert.daysSinceLast} dias</span>
                    )}
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Vencimento (8 Meses)</span>
                    <span className="font-mono font-black text-xs text-purple-300">
                      {formatDatePtBr(vehicle.nextRevisionDate)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Prazo Oficial</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Status do Prazo</span>
                    <span
                      className={`font-mono font-black text-xs ${
                        alert.daysRemaining !== undefined && alert.daysRemaining <= 0
                          ? 'text-rose-400'
                          : alert.daysRemaining !== undefined && alert.daysRemaining <= 30
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {alert.daysRemaining !== undefined && alert.daysRemaining <= 0
                        ? `VENCIDA (-${Math.abs(alert.daysRemaining)}d)`
                        : `Restam ${alert.daysRemaining ?? 0}d`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 bg-purple-950/60 p-2 rounded-lg border border-purple-500/20 leading-relaxed">
                  📅 <strong>Critério Operacional:</strong> Esta placa tem seu vencimento calculado <strong>exclusivamente por data</strong> (ciclo de 8 meses a partir da última revisão). Ela não é bloqueada ou apontada como vencida por quilometragem (KM).
                </p>
              </div>
            )}

            {/* Painel Informativo / Ação quando a regra de 8 meses NÃO está selecionada */}
            {vehicle.type === 'cavalo' && !isTimeBased && (
              <div className="p-3 bg-gradient-to-r from-slate-950/90 via-purple-950/20 to-slate-900 rounded-xl border border-slate-800 hover:border-purple-500/40 transition flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 font-bold shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        Regra Temporal de 8 Meses (Scania)
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        DESMARCADA
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Monitorando por KM (Trava 40k). Clique ao lado para ativar a regra temporal de 8 meses para esta placa sem recadastrar.
                    </p>
                  </div>
                </div>
                {onToggleTimeBased && (
                  <button
                    type="button"
                    onClick={() => onToggleTimeBased(vehicle.plate, true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-200 hover:text-white bg-purple-900/60 hover:bg-purple-800 border border-purple-500/50 transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                    title="Ativar a regra temporal de 8 meses para esta placa imediatamente"
                  >
                    <Clock className="w-3.5 h-3.5 text-purple-300" />
                    <span>Ativar 8 Meses</span>
                  </button>
                )}
              </div>
            )}

            {/* Painel Especial Scania: O que cada revisão faz & Preço Cotrasa (Trava de 40k & Alerta de 20k) */}
            {vehicle.type === 'cavalo' && (() => {
              const revKey = vehicle.nextRevisionType || 'REVISAO S';
              const cleanKey = revKey.includes('L') ? 'REVISAO L' : revKey.includes('M') ? 'REVISAO M' : revKey.includes('X') ? 'REVISAO X' : 'REVISAO S';
              const detail: ScaniaRevisionDetail | undefined = SCANIA_REVISIONS_CATALOG[cleanKey];

              return (
                <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-slate-900 to-amber-950/30 rounded-xl border border-blue-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                        Plano de Revisão Scania • Cotrasa
                      </span>
                    </div>
                    {detail && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        {detail.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </div>

                  {detail ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-white block">{detail.title}</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {detail.shortDescription}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono text-[11px]">
                        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                          <span className="text-[9px] font-sans text-slate-400 block">Peças</span>
                          <span className="text-slate-200 font-bold">
                            {detail.partsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                          <span className="text-[9px] font-sans text-slate-400 block">Lubrificantes</span>
                          <span className="text-slate-200 font-bold">
                            {detail.lubricantsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                          <span className="text-[9px] font-sans text-slate-400 block">Mão de Obra</span>
                          <span className="text-slate-200 font-bold">
                            {detail.laborCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            Trava de KM do Ciclo ({vehicle.plate}):
                          </span>
                          <span className="font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                            {(vehicle.cavaloTaraKm || 40000).toLocaleString('pt-BR')} KM
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400">
                          <span>Alerta intermediário: {Math.round((vehicle.cavaloTaraKm || 40000) / 2).toLocaleString('pt-BR')} KM</span>
                          {onUpdateCavaloTaraKm && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Mudar trava:</span>
                              {[20000, 30000, 40000, 50000].map((km) => (
                                <button
                                  key={km}
                                  type="button"
                                  onClick={() => onUpdateCavaloTaraKm(vehicle.plate, km)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                                    (vehicle.cavaloTaraKm || 40000) === km
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                                  }`}
                                  title={`Alterar trava desta placa para ${km.toLocaleString('pt-BR')} KM`}
                                >
                                  {km / 1000}k
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-950/90 border border-slate-800/80 text-[11px] text-slate-300">
                        <strong className="text-amber-400 font-semibold">Trava e Ciclo:</strong> {detail.cyclePositionExplanation}
                      </div>

                      <div className="p-2 rounded bg-slate-950/90 border border-amber-500/40 text-[11px] text-slate-300 flex items-center justify-between">
                        <span className="text-amber-300 font-bold">Oficina de Manutenção Cavalo:</span>
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-500/50 font-bold">
                          APENAS SCANIA (Concessionária Oficial)
                        </span>
                      </div>

                      {onOpenRevisionCatalog && (
                        <button
                          type="button"
                          onClick={() => onOpenRevisionCatalog(detail.id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-blue-900/40 hover:bg-blue-800/60 border border-blue-600/50 text-blue-200 font-bold transition cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Itens Faturados & O Que Faz no Orçamento Cotrasa ({detail.budgetNumber})</span>
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {/* Painel Especial da Carreta: Trava 60K e Alerta 50K */}
            {vehicle.type === 'carreta' && (
              <div className="p-3.5 bg-gradient-to-r from-amber-950/40 to-slate-900 rounded-xl border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚛</span>
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Trava Operacional: {(vehicle.carretaTaraKm || 60000).toLocaleString('pt-BR')} KM (Vencida aos 60K • Atenção aos 50K)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Trava 60K
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">KM no Ciclo Atual</span>
                    <span className="font-mono font-black text-xs text-white">
                      {Math.max(0, vehicle.currentMeter - vehicle.lastMaintenanceMeter).toLocaleString('pt-BR')} KM
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Trava Máxima</span>
                    <span className="font-mono font-black text-xs text-amber-400">
                      {(vehicle.carretaTaraKm || 60000).toLocaleString('pt-BR')} KM
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Situação</span>
                    <span className={`font-mono font-black text-xs ${alert.level === 'critical' ? 'text-rose-400' : alert.level === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {alert.level === 'critical' ? 'VENCIDA (> 60K)' : alert.level === 'warning' ? 'ATENÇÃO (≥ 50K)' : 'EM DIA'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 bg-amber-950/60 p-2 rounded-lg border border-amber-500/20 leading-relaxed">
                  ⚡ <strong>Regra Oficial:</strong> A carreta entra em <strong>ATENÇÃO aos 50.000 KM</strong> rodados para programar manutenção de freios e só é marcada como <strong>VENCIDA ao ultrapassar a Trava de 60.000 KM</strong>. Ao realizar a revisão, o odômetro é zerado para <strong>0 KM</strong> para iniciar novo ciclo.
                </p>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400 font-semibold">3 Oficinas Homologadas:</span>
                    <span className="text-[11px] text-slate-400">Rede oficial autorizada para carretas:</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                      MOLA MUNDIAL
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                      COROA
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                      VAMOS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Painel Especial TK (Thermo King): Oficinas Homologadas e Regra 500H */}
            {vehicle.type === 'tk' && (
              <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 to-slate-900 rounded-xl border border-cyan-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">❄️</span>
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                      {isTkFilter500hPlate(vehicle.plate) || vehicle.isTk500hFilterRule
                        ? 'Regra Especial das 7 Placas • Troca de Filtro (500 Horas)'
                        : 'Equipamento Thermo King • Preventiva Periódica (1.500 Horas)'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {isTkFilter500hPlate(vehicle.plate) || vehicle.isTk500hFilterRule
                      ? '7 PLACAS (500H)'
                      : 'PADRÃO (1.500H)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Horímetro Atual</span>
                    <span className="font-mono font-black text-xs text-white">
                      {vehicle.currentMeter.toLocaleString('pt-BR')}h
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Próxima Revisão</span>
                    <span className="font-mono font-black text-xs text-cyan-300">
                      {vehicle.nextRevisionMeter.toLocaleString('pt-BR')}h
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Saldo Restante</span>
                    <span
                      className={`font-mono font-black text-xs ${
                        alert.difference <= 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {alert.difference <= 0
                        ? `VENCIDA (-${Math.abs(alert.difference)}h)`
                        : `+${alert.difference}h`}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-cyan-400 font-semibold">Oficinas Homologadas:</span>
                    <span className="text-[11px] text-slate-400">Rede autorizada para preventivas e corretivas:</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600/40">
                      VIDEFRIGO
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600/40">
                      MUNIQUE
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600/40">
                      VAMOS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Ações Rápidas Operacionais */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenRegisterMaintenance(vehicle);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Registrar Conclusão de Revisão</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenUpdateMeter(vehicle);
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>Atualizar {vehicle.meterUnit}</span>
              </button>
            </div>

            {/* Gráfico D3.js de Evolução da Quilometragem / Horas */}
            <VehicleMeterHistoryChart vehicle={vehicle} history={history} />

            {/* Linha do Tempo / Histórico de Manutenções do Veículo */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Histórico de Intervenções ({vehicleHistory.length})</span>
                </h3>
                <div className="flex items-center gap-3">
                  {vehicle.type === 'tk' && onClearTkHistory && (
                    <button
                      onClick={() => setIsConfirmingClearTk(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center gap-1 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 transition"
                      title="Excluir histórico de todos os TKs"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar Histórico TKs</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenRegisterMaintenance(vehicle);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    + Adicionar Registro
                  </button>
                </div>
              </div>

              {vehicleHistory.length === 0 ? (
                <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                  Nenhum histórico anterior registrado para este veículo.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {vehicleHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 text-sm">
                            {item.revisionType}
                          </span>
                          {/* Badge de Execução Concessionária Scania */}
                          {item.executionStatus === 'NÃO' || item.executed === false ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              NÃO (Programada)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              SIM (Realizada)
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {item.executionStatus === 'NÃO' || item.executed === false
                              ? '• Programada'
                              : `em ${formatDatePtBr(item.date)}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-200">
                            {formatMeter(item.meterReading, vehicle.meterUnit)}
                          </span>

                          {/* Botão de Editar Histórico */}
                          {onUpdateHistoryRecord && (
                            <button
                              onClick={() => setEditingHistoryRecord(item)}
                              className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition cursor-pointer"
                              title="Editar data, odômetro ou dados desta revisão"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão de Excluir Histórico */}
                          {onDeleteHistoryRecord && (
                            <button
                              onClick={() => setRecordToDelete(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                              title="Excluir este histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dados da Oficina e Custo */}
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                        <span>
                          Oficina: <strong className="text-slate-300">{item.workshop}</strong>
                          {item.workshop && ['VIDEFRIGO', 'MUNIQUE', 'VAMOS'].some(w => item.workshop.toUpperCase().includes(w)) && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono">
                              AUTORIZADA TK
                            </span>
                          )}
                          {item.workshop && ['MOLA MUNDIAL', 'COROA', 'VAMOS'].some(w => item.workshop.toUpperCase().includes(w)) && vehicle.type === 'carreta' && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                              AUTORIZADA CARRETA
                            </span>
                          )}
                          {item.workshop && item.workshop.toUpperCase().includes('SCANIA') && vehicle.type === 'cavalo' && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-950 text-amber-300 border border-amber-700/60 font-mono">
                              REDE SCANIA
                            </span>
                          )}
                        </span>
                        {item.technician && <span>Técnico: <strong className="text-slate-300">{item.technician}</strong></span>}
                        {item.cost && (
                          <span className="text-emerald-400 font-bold">
                            R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <span>Meta Programada: <strong className="text-amber-300 font-mono">{(item.nextScheduledMeter ?? 0).toLocaleString('pt-BR')} {vehicle.meterUnit}</strong></span>
                      </div>

                      {/* Visualizador de Nota Fiscal / Anexo em PDF ou botão para anexar */}
                      {item.invoiceAttachment ? (
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            onClick={() =>
                              setActiveInvoice({
                                attachment: item.invoiceAttachment!,
                                invoiceNumber: item.invoiceNumber,
                                plate: item.plate,
                                revisionType: item.revisionType,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold transition cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {item.invoiceNumber ? `${item.invoiceNumber} • ` : ''}
                              Ver Nota Fiscal Anexa ({item.invoiceAttachment.name})
                            </span>
                            <Eye className="w-3 h-3 text-emerald-400 ml-1" />
                          </button>
                        </div>
                      ) : onUpdateHistoryRecord ? (
                        <div className="pt-1">
                          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-dashed border-slate-600 text-slate-300 hover:text-amber-400 hover:border-amber-500 text-xs font-medium transition cursor-pointer">
                            <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                            <span>Anexar PDF / Nota Fiscal</span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleAttachToExisting(item, file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      ) : null}

                      {item.partsReplaced && item.partsReplaced.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.partsReplaced.map((part, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700/50"
                            >
                              {part}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RASTREABILIDADE E LOG DE ALTERAÇÕES DESTA PLACA */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                  <span>Rastreabilidade e Log de Alterações ({vehicleLogs.length})</span>
                </h3>
                <span className="text-[10px] text-slate-400">
                  Histórico de atualizações de KM e quem realizou
                </span>
              </div>

              {vehicleLogs.length === 0 ? (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                  Nenhum registro de alteração de KM ou manutenção registrado recentemente para esta placa.
                </div>
              ) : (
                <div className="space-y-2">
                  {vehicleLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 hover:border-slate-700 transition flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white font-mono text-[11px]">
                            {log.dateStr} às {log.timeStr}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-amber-300 border border-slate-700">
                            {log.type === 'meter_update'
                              ? 'Leitura Atualizada'
                              : log.type === 'maintenance_performed'
                              ? 'Revisão Realizada'
                              : 'Sincronização Diária'}
                          </span>
                        </div>
                        <p className="text-slate-200 font-medium">{log.action}</p>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <UserCheck className="w-3 h-3 text-amber-400" />
                          <span>
                            Quem realizou: <strong className="text-slate-300">{log.performedBy}</strong>
                          </span>
                          {log.workshop && <span>• {log.workshop}</span>}
                        </div>
                        {log.notes && (
                          <p className="text-[10px] text-slate-400 italic">"{log.notes}"</p>
                        )}
                      </div>

                      {log.difference !== undefined && log.difference !== 0 && (
                        <div className="text-right font-mono text-[11px] shrink-0">
                          <span
                            className={
                              log.difference > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'
                            }
                          >
                            {log.difference > 0
                              ? `+${log.difference.toLocaleString('pt-BR')}`
                              : log.difference.toLocaleString('pt-BR')}{' '}
                            {log.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            {onDeleteVehicle ? (
              <button
                onClick={() => setIsConfirmingDeleteVehicle(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 hover:border-rose-700 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="Excluir esta placa da frota"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Placa
              </button>
            ) : <div />}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Excluir Placa da Frota */}
      {isConfirmingDeleteVehicle && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-rose-700/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950 flex items-center justify-center border border-rose-800 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Placa {vehicle.plate}?</h3>
                <p className="text-xs text-slate-400">
                  Esta ação removerá a unidade definitivamente da frota ativa e das previsões.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingDeleteVehicle(false)}
                className="px-3.5 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteVehicle) {
                    onDeleteVehicle(vehicle.id);
                  }
                  setIsConfirmingDeleteVehicle(false);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir Placa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Histórico */}
      {recordToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-700/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950 flex items-center justify-center border border-rose-800">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Registro de Revisão?</h3>
                <p className="text-xs text-slate-400">Esta ação removerá a intervenção do histórico.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteRecord(recordToDelete)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow cursor-pointer"
              >
                Sim, Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação Limpar Histórico de TKs */}
      {isConfirmingClearTk && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-700/80 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 flex items-center justify-center border border-cyan-800 shrink-0">
                <Trash2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Todos os Históricos de TK?</h3>
                <p className="text-xs text-slate-400">
                  Esta ação removerá todos os registros de manutenções realizadas dos aparelhos TK da frota.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <p>Os horímetros e alertas dos aparelhos TK permanecerão inalterados, mas os históricos de revisões passadas serão apagados.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingClearTk(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onClearTkHistory) {
                    onClearTkHistory();
                  }
                  setIsConfirmingClearTk(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg shadow-cyan-950/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Limpar Histórico TKs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Nota Fiscal */}
      {activeInvoice && (
        <InvoiceViewerModal
          attachment={activeInvoice.attachment}
          invoiceNumber={activeInvoice.invoiceNumber}
          plate={activeInvoice.plate}
          revisionType={activeInvoice.revisionType}
          onClose={() => setActiveInvoice(null)}
        />
      )}

      {/* Modal para Editar Histórico de Manutenção Selecionado */}
      {editingHistoryRecord && onUpdateHistoryRecord && (
        <EditMaintenanceRecordModal
          record={editingHistoryRecord}
          onClose={() => setEditingHistoryRecord(null)}
          onSave={(updatedRecord) => {
            onUpdateHistoryRecord(updatedRecord);
            setEditingHistoryRecord(null);
          }}
        />
      )}

      {/* Modal para Editar Dados da Última Revisão do Veículo */}
      {isEditingLastRev && onUpdateVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Editar Dados da Última Revisão
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placa: <strong className="font-mono text-slate-200">{vehicle.plate}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingLastRev(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const isTime = vehicle.isTimeBasedRevision;
                const nextRevDate = isTime && editLastRevDate ? addMonthsToDate(editLastRevDate, 8) : vehicle.nextRevisionDate;

                const updated: Vehicle = {
                  ...vehicle,
                  lastMaintenanceDate: editLastRevDate,
                  lastMaintenanceMeter: Number(editLastRevMeter),
                  lastMaintenanceType: editLastRevType as any,
                  nextRevisionType: editNextRevType as any,
                  nextRevisionMeter: Number(editNextRevMeter),
                  nextRevisionDate: nextRevDate,
                  updatedAt: new Date().toISOString(),
                };
                onUpdateVehicle(updated);
                setIsEditingLastRev(false);
              }}
              className="p-4 space-y-3.5 text-xs overflow-y-auto"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Data Real da Última Revisão
                </label>
                <input
                  type="date"
                  required
                  value={editLastRevDate}
                  onChange={(e) => setEditLastRevDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Exibição: <strong className="text-amber-300">{formatDatePtBr(editLastRevDate)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {vehicle.meterUnit === 'HORAS' ? 'Horímetro da Revisão' : 'Odômetro da Revisão (KM)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editLastRevMeter}
                    onChange={(e) => setEditLastRevMeter(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tipo da Revisão
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastRevType}
                    onChange={(e) => setEditLastRevType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Próxima Revisão
                  </label>
                  <input
                    type="text"
                    required
                    value={editNextRevType}
                    onChange={(e) => setEditNextRevType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Meta Alvo ({vehicle.meterUnit})
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editNextRevMeter}
                    onChange={(e) => setEditNextRevMeter(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingLastRev(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

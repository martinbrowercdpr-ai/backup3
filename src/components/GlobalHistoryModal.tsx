import React, { useState } from 'react';
import {
  X,
  History,
  Search,
  FileSpreadsheet,
  FileText,
  Calendar,
  DollarSign,
  Wrench,
  Trash2,
  Receipt,
  Eye,
  Paperclip,
  Plus,
  ClipboardList,
  Edit3,
} from 'lucide-react';
import { MaintenanceRecord, VehicleType, InvoiceAttachment } from '../types';
import { getVehicleTypeLabel, formatDatePtBr } from '../utils/maintenanceCalculations';
import { InvoiceViewerModal } from './InvoiceViewerModal';
import { EditMaintenanceRecordModal } from './EditMaintenanceRecordModal';

interface GlobalHistoryModalProps {
  isOpen: boolean;
  history: MaintenanceRecord[];
  onClose: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onOpenChangeLog?: () => void;
  onDeleteHistoryRecord?: (recordId: string) => void;
  onUpdateHistoryRecord?: (updatedRecord: MaintenanceRecord) => void;
  onClearCavaloHistory?: () => void;
  onClearCarretaHistory?: () => void;
  onClearTkHistory?: () => void;
  onRestoreCarretaHistory?: () => void;
  onOpenManualMaintenance?: () => void;
}

export const GlobalHistoryModal: React.FC<GlobalHistoryModalProps> = ({
  isOpen,
  history,
  onClose,
  onExportExcel,
  onExportPdf,
  onOpenChangeLog,
  onDeleteHistoryRecord,
  onUpdateHistoryRecord,
  onClearCavaloHistory,
  onClearCarretaHistory,
  onClearTkHistory,
  onRestoreCarretaHistory,
  onOpenManualMaintenance,
}) => {
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | VehicleType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'SIM' | 'NÃO'>('all');
  const [activeInvoice, setActiveInvoice] = useState<{
    attachment: InvoiceAttachment;
    invoiceNumber?: string;
    plate?: string;
    revisionType?: string;
  } | null>(null);

  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [isConfirmingClearCavalo, setIsConfirmingClearCavalo] = useState<boolean>(false);
  const [isConfirmingClearCarreta, setIsConfirmingClearCarreta] = useState<boolean>(false);
  const [isConfirmingClearTk, setIsConfirmingClearTk] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAttachToExisting = (record: MaintenanceRecord, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const updated: MaintenanceRecord = {
        ...record,
        invoiceAttachment: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
        },
      };
      if (onUpdateHistoryRecord) {
        onUpdateHistoryRecord(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredHistory = history
    .filter((item) => {
      if (typeFilter !== 'all' && item.vehicleType !== typeFilter) {
        return false;
      }
      if (statusFilter === 'SIM' && item.executionStatus === 'NÃO') {
        return false;
      }
      if (statusFilter === 'NÃO' && item.executionStatus !== 'NÃO') {
        return false;
      }
      const q = search.toLowerCase().trim();
      if (q) {
        const matchPlate = (item.plate || '').toLowerCase().includes(q);
        const matchRev = (item.revisionType || '').toLowerCase().includes(q);
        const matchShop = (item.workshop || '').toLowerCase().includes(q);
        const matchTech = (item.technician || '').toLowerCase().includes(q);
        const matchInvoice = (item.invoiceNumber || '').toLowerCase().includes(q);
        const matchStatus = (item.executionStatus || '').toLowerCase().includes(q);
        if (!matchPlate && !matchRev && !matchShop && !matchTech && !matchInvoice && !matchStatus) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCost = filteredHistory.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  const handleDeleteRecord = (recordId: string) => {
    if (onDeleteHistoryRecord) {
      onDeleteHistoryRecord(recordId);
      setRecordToDelete(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Histórico Geral de Manutenções da Frota
                </h2>
                <p className="text-xs text-slate-400">
                  Registro de intervenções preventivas, corretivas e notas fiscais anexas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenManualMaintenance && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenManualMaintenance();
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1 cursor-pointer shadow-sm"
                  title="Registrar manutenção manual"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Manutenção Manual</span>
                </button>
              )}
              {onClearCavaloHistory && (
                <button
                  onClick={() => setIsConfirmingClearCavalo(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-950/70 text-rose-300 border border-rose-800/80 hover:bg-rose-900 transition flex items-center gap-1 cursor-pointer"
                  title="Excluir todos os registros de histórico de Cavalos"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Limpar Histórico Cavalos</span>
                  <span className="sm:hidden">Limpar Cavalos</span>
                </button>
              )}
              {onClearCarretaHistory && (
                <button
                  onClick={() => setIsConfirmingClearCarreta(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-950/70 text-orange-300 border border-orange-800/80 hover:bg-orange-900 transition flex items-center gap-1 cursor-pointer"
                  title="Excluir todos os registros de histórico de Carretas"
                >
                  <Trash2 className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden sm:inline">Limpar Histórico Carretas</span>
                  <span className="sm:hidden">Limpar Carretas</span>
                </button>
              )}
              {onClearTkHistory && (
                <button
                  onClick={() => setIsConfirmingClearTk(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-950/70 text-cyan-300 border border-cyan-800/80 hover:bg-cyan-900 transition flex items-center gap-1 cursor-pointer"
                  title="Excluir todos os registros de histórico de TKs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Limpar Histórico TKs</span>
                  <span className="sm:hidden">Limpar TKs</span>
                </button>
              )}
              {onRestoreCarretaHistory && (
                <button
                  onClick={onRestoreCarretaHistory}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-950/70 text-blue-300 border border-blue-800/80 hover:bg-blue-900 transition flex items-center gap-1 cursor-pointer"
                  title="Restaurar as 139 revisões oficiais de Carretas fornecidas"
                >
                  <History className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Restaurar Carretas (139)</span>
                  <span className="sm:hidden">Restaurar Carretas</span>
                </button>
              )}
              {onOpenChangeLog && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenChangeLog();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-950/70 text-amber-300 border border-amber-800/80 hover:bg-amber-900 transition flex items-center gap-1 cursor-pointer"
                  title="Ver Log de Alterações de KM e Manutenções"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                  <span>Log de Alterações</span>
                </button>
              )}
              <button
                onClick={onExportExcel}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={onExportPdf}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Barra de Filtros e Totalizadores */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por placa, tipo de revisão, oficina, mecânico ou NF..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    typeFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setTypeFilter('cavalo')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    typeFilter === 'cavalo' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cavalos
                </button>
                <button
                  onClick={() => setTypeFilter('carreta')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    typeFilter === 'carreta' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Carretas
                </button>
                <button
                  onClick={() => setTypeFilter('tk')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    typeFilter === 'tk' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  TKs
                </button>
              </div>

              {/* Filtro por Status da Concessionária (SIM / NÃO) */}
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    statusFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({history.length})
                </button>
                <button
                  onClick={() => setStatusFilter('SIM')}
                  className={`px-2 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'SIM' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  <span>Realizadas (SIM)</span>
                </button>
                <button
                  onClick={() => setStatusFilter('NÃO')}
                  className={`px-2 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'NÃO' ? 'bg-amber-600 text-white font-bold' : 'text-amber-400 hover:text-white'
                  }`}
                >
                  <span>Programadas (NÃO)</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-xs flex items-center gap-1.5">
                <span className="text-slate-400">Total:</span>
                <span className="font-mono font-bold text-emerald-400">
                  R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Banner contextual de Ações Rápidas por Categoria */}
          {typeFilter === 'tk' && onClearTkHistory && (
            <div className="mx-4 mt-3 p-2.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl flex items-center justify-between text-xs shrink-0">
              <span className="text-cyan-300 font-medium flex items-center gap-1.5">
                ❄️ Registros de manutenções dos aparelhos Thermo King (TK).
              </span>
              <button
                onClick={() => setIsConfirmingClearTk(true)}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-cyan-900 hover:bg-cyan-800 text-white flex items-center gap-1.5 cursor-pointer transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Limpar Histórico TKs</span>
              </button>
            </div>
          )}

          {typeFilter === 'carreta' && onClearCarretaHistory && (
            <div className="mx-4 mt-3 p-2.5 bg-orange-950/40 border border-orange-800/60 rounded-xl flex items-center justify-between text-xs shrink-0">
              <span className="text-orange-300 font-medium flex items-center gap-1.5">
                🚛 Registros de manutenções de Carretas (Trava 30.000 KM).
              </span>
              <div className="flex items-center gap-2">
                {onRestoreCarretaHistory && (
                  <button
                    onClick={onRestoreCarretaHistory}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-900/70 hover:bg-blue-800 text-blue-200 border border-blue-700/60 flex items-center gap-1 cursor-pointer transition"
                  >
                    <History className="w-3 h-3 text-blue-300" />
                    <span>Restaurar Oficiais (139)</span>
                  </button>
                )}
                <button
                  onClick={() => setIsConfirmingClearCarreta(true)}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-orange-900 hover:bg-orange-800 text-white flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Limpar Histórico Carretas</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Registros */}
          <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum registro encontrado para os filtros selecionados.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-amber-400">
                        {item.plate}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {getVehicleTypeLabel(item.vehicleType)}
                      </span>
                      <span className="font-bold text-white">
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
                      {item.isTimeBasedRevision && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          ⏱️ 8 Meses
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.executionStatus === 'NÃO' || item.executed === false
                          ? 'Programada'
                          : formatDatePtBr(item.date)}
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        Medição: {item.meterReading.toLocaleString('pt-BR')} {item.vehicleType === 'tk' ? 'HORAS' : 'KM'}
                      </span>
                      {item.cost && (
                        <span className="font-mono font-bold text-emerald-400">
                          R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}

                      {/* Botão de Editar Histórico */}
                      {onUpdateHistoryRecord && (
                        <button
                          onClick={() => setEditingRecord(item)}
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
                          title="Excluir este registro de manutenção"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span>Oficina: <strong className="text-slate-300">{item.workshop}</strong></span>
                    {item.technician && <span>Técnico: <strong className="text-slate-300">{item.technician}</strong></span>}
                    <span>
                      Próxima Meta:{' '}
                      <strong className="text-amber-300 font-mono">
                        {item.nextScheduledMeter.toLocaleString('pt-BR')} {item.vehicleType === 'tk' ? 'HORAS' : 'KM'}
                      </strong>
                    </span>
                    {item.nextScheduledDate && (
                      <span>
                        Vencimento Previsto: <strong className="text-purple-300 font-mono">{formatDatePtBr(item.nextScheduledDate)}</strong>
                      </span>
                    )}
                  </div>

                  {/* Anexo de Nota Fiscal ou Botão para Anexar */}
                  {item.invoiceAttachment ? (
                    <div className="pt-1">
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
                      {item.partsReplaced.map((part, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px] border border-slate-700/50"
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
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              Mostrando {filteredHistory.length} de {history.length} manutenções registradas
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Exclusão de Registro */}
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

      {/* Modal de Confirmação para Excluir Todos os Históricos de Cavalo */}
      {isConfirmingClearCavalo && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-700/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950 flex items-center justify-center border border-rose-800 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Todos os Históricos de Cavalo?</h3>
                <p className="text-xs text-slate-400">
                  Esta ação removerá definitivamente todos os registros de manutenções realizadas de todos os Cavalos da frota.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <p>Os odômetros e parâmetros dos veículos permanecerão inalterados, mas os históricos de revisões passadas de Cavalos serão apagados.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingClearCavalo(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onClearCavaloHistory) {
                    onClearCavaloHistory();
                  }
                  setIsConfirmingClearCavalo(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-950/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação Limpar Histórico de Carretas */}
      {isConfirmingClearCarreta && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-orange-700/80 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-950 flex items-center justify-center border border-orange-800 shrink-0">
                <Trash2 className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Todos os Históricos de Carreta?</h3>
                <p className="text-xs text-slate-400">
                  Esta ação removerá todos os registros de manutenções realizadas das Carretas da frota.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <p>Você poderá restaurar as 139 revisões oficiais a qualquer momento clicando em &quot;Restaurar Carretas (139)&quot;.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingClearCarreta(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onClearCarretaHistory) {
                    onClearCarretaHistory();
                  }
                  setIsConfirmingClearCarreta(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-lg shadow-orange-950/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Limpar Carretas
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
                  Esta ação removerá todos os registros de manutenções realizadas dos TKs da frota.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <p>Os horímetros e parâmetros dos TKs permanecerão inalterados, mas os históricos de revisões passadas serão apagados.</p>
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
                Sim, Limpar TKs
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

      {/* Modal de Edição de Registro de Manutenção */}
      {editingRecord && onUpdateHistoryRecord && (
        <EditMaintenanceRecordModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={(updatedRecord) => {
            onUpdateHistoryRecord(updatedRecord);
            setEditingRecord(null);
          }}
        />
      )}
    </>
  );
};

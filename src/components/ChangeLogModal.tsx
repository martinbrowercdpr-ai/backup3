import React, { useState, useMemo } from 'react';
import {
  X,
  ClipboardList,
  Search,
  Filter,
  Calendar,
  UserCheck,
  Wrench,
  Gauge,
  Clock,
  Truck,
  Container,
  Snowflake,
  Download,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
} from 'lucide-react';
import { ChangeLogEntry, VehicleType, ChangeLogType } from '../types';

interface ChangeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ChangeLogEntry[];
  onClearLogs?: () => void;
}

export const ChangeLogModal: React.FC<ChangeLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | ChangeLogType>('all');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'all' | VehicleType>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '7d' | '30d'>('all');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  if (!isOpen) return null;

  // Filtragem dos logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Tipo de log
      if (selectedType !== 'all' && log.type !== selectedType) {
        return false;
      }

      // 2. Tipo de veículo
      if (selectedVehicleType !== 'all' && log.vehicleType !== selectedVehicleType) {
        return false;
      }

      // 3. Período
      if (selectedPeriod !== 'all') {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        const daysDiff = (now - logDate) / (1000 * 60 * 60 * 24);
        if (selectedPeriod === '7d' && daysDiff > 7) return false;
        if (selectedPeriod === '30d' && daysDiff > 30) return false;
      }

      // 4. Termo de busca (Placa, Responsável, Oficina, Ação ou Notas)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesPlate = log.plate.toLowerCase().includes(query);
        const matchesPerformedBy = log.performedBy.toLowerCase().includes(query);
        const matchesWorkshop = log.workshop?.toLowerCase().includes(query);
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesNotes = log.notes?.toLowerCase().includes(query);
        return matchesPlate || matchesPerformedBy || matchesWorkshop || matchesAction || matchesNotes;
      }

      return true;
    });
  }, [logs, selectedType, selectedVehicleType, selectedPeriod, searchTerm]);

  // Estatísticas do Log
  const stats = useMemo(() => {
    const total = logs.length;
    const meterUpdates = logs.filter((l) => l.type === 'meter_update').length;
    const maintenances = logs.filter((l) => l.type === 'maintenance_performed').length;
    const batchSyncs = logs.filter((l) => l.type === 'batch_sync').length;
    const tkHoursUpdates = logs.filter((l) => l.unit === 'HORAS').length;

    return { total, meterUpdates, maintenances, batchSyncs, tkHoursUpdates };
  }, [logs]);

  // Exportar para CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Data',
      'Hora',
      'Tipo de Registro',
      'Placa',
      'Tipo Veículo',
      'Quem Realizou / Responsável',
      'Oficina / Local',
      'Resumo da Ação',
      'Valor Anterior',
      'Novo Valor',
      'Variação',
      'Unidade',
      'Observações',
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.dateStr}"`,
      `"${log.timeStr}"`,
      `"${
        log.type === 'meter_update'
          ? 'Atualização de Medidor'
          : log.type === 'maintenance_performed'
          ? 'Manutenção Realizada'
          : 'Sincronização em Lote'
      }"`,
      `"${log.plate}"`,
      `"${log.vehicleType.toUpperCase()}"`,
      `"${log.performedBy}"`,
      `"${log.workshop || '-'}"`,
      `"${log.action.replace(/"/g, '""')}"`,
      log.previousValue !== undefined ? log.previousValue : '',
      log.newValue !== undefined ? log.newValue : '',
      log.difference !== undefined ? log.difference : '',
      `"${log.unit}"`,
      `"${(log.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Log_Alteracoes_Frota_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case 'cavalo':
        return <Truck className="w-3.5 h-3.5 text-sky-400" />;
      case 'carreta':
        return <Container className="w-3.5 h-3.5 text-amber-400" />;
      case 'tk':
        return <Snowflake className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Truck className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <ClipboardList className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Log de Alterações e Rastreabilidade
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {logs.length} registros auditados
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Histórico automático com datas das últimas atualizações de KM/Horas e quem realizou cada manutenção
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 active:scale-95"
              title="Exportar registros filtrados para CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            {onClearLogs && (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition cursor-pointer"
                title="Limpar registros do Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confirmação de Limpeza do Log */}
        {isConfirmingClear && (
          <div className="bg-rose-950/60 border-b border-rose-800/80 px-6 py-3 flex items-center justify-between gap-3 text-xs text-rose-200 flex-wrap animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Deseja realmente limpar todo o histórico do Log de Alterações? Esta ação não pode ser desfeita.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfirmingClear(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onClearLogs?.();
                  setIsConfirmingClear(false);
                }}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Sim, Limpar Log
              </button>
            </div>
          </div>
        )}

        {/* KPI Mini-cards */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total de Entradas</span>
            <span className="text-base font-bold text-white font-mono">{stats.total}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">registros no sistema</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-amber-400 block flex items-center gap-1">
              <Gauge className="w-3 h-3" /> Atualizações de KM
            </span>
            <span className="text-base font-bold text-amber-300 font-mono">{stats.meterUpdates}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">odômetro cavalo/carreta</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-cyan-400 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> Horímetro TK
            </span>
            <span className="text-base font-bold text-cyan-300 font-mono">{stats.tkHoursUpdates}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">horas de motor diesel</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-emerald-400 block flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Manutenções Realizadas
            </span>
            <span className="text-base font-bold text-emerald-300 font-mono">{stats.maintenances}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">revisões com mecânico</span>
          </div>
        </div>

        {/* Filtros e Barra de Busca */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, mecânico, técnico, oficina ou tipo de ação..."
              className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros por Categoria e Veículo */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de Tipo de Log */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
            >
              <option value="all">Todos os Tipos de Log</option>
              <option value="meter_update">⏱️ Atualização de KM / Horas</option>
              <option value="maintenance_performed">🔧 Revisão / Manutenção</option>
              <option value="batch_sync">📊 Sincronização Diária</option>
            </select>

            {/* Filtro de Veículo */}
            <select
              value={selectedVehicleType}
              onChange={(e) => setSelectedVehicleType(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
            >
              <option value="all">Todas as Frotas</option>
              <option value="cavalo">🚛 Cavalos (KM)</option>
              <option value="carreta">🚚 Carretas (KM)</option>
              <option value="tk">❄️ TKs (Horas)</option>
            </select>

            {/* Filtro de Período */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
            >
              <option value="all">Todo o Período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
              <p className="text-sm font-semibold text-slate-300">Nenhum registro encontrado</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Não há alterações registradas que correspondam aos filtros de busca selecionados.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredLogs.map((log) => {
                const isMaintenance = log.type === 'maintenance_performed';
                const isMeterUpdate = log.type === 'meter_update';
                const isBatchSync = log.type === 'batch_sync';
                const isHours = log.unit === 'HORAS';

                return (
                  <div
                    key={log.id}
                    className="p-3.5 sm:px-6 hover:bg-slate-900/60 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                  >
                    {/* Data, Veículo e Badge */}
                    <div className="flex items-start gap-3 min-w-[240px]">
                      <div className="text-slate-400 font-mono text-[11px] shrink-0 pt-0.5">
                        <span className="block font-bold text-white">{log.dateStr}</span>
                        <span className="text-[10px] text-slate-500">{log.timeStr}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-200 border border-slate-700">
                            {getVehicleIcon(log.vehicleType)}
                            <span>{log.plate}</span>
                          </span>

                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                              isMaintenance
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                : isMeterUpdate
                                ? isHours
                                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                : 'bg-teal-950/80 text-teal-300 border border-teal-800/60'
                            }`}
                          >
                            {isMaintenance
                              ? 'Revisão Realizada'
                              : isMeterUpdate
                              ? isHours
                                ? 'Horímetro Atualizado'
                                : 'KM Atualizado'
                              : 'Sincronização Diária'}
                          </span>
                        </div>

                        {/* Quem realizou (Destaque de Rastreabilidade) */}
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-semibold text-slate-200">
                            {log.performedBy || 'Operador de Frota'}
                          </span>
                          {log.workshop && (
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              • <Building2 className="w-3 h-3 text-slate-500 inline" /> {log.workshop}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Descrição da Ação e Observações */}
                    <div className="flex-1 space-y-1 md:px-4">
                      <p className="text-slate-200 font-medium">{log.action}</p>
                      {log.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    {/* Valores de KM / Horas e Variação */}
                    <div className="text-right shrink-0 font-mono self-end md:self-auto bg-slate-950/40 md:bg-transparent p-2 md:p-0 rounded-lg border border-slate-800 md:border-0">
                      {log.newValue !== undefined ? (
                        <div>
                          <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                            {log.previousValue !== undefined && (
                              <span className="text-slate-500 font-normal text-[11px]">
                                {log.previousValue.toLocaleString('pt-BR')} →
                              </span>
                            )}
                            <span className={isHours ? 'text-cyan-300' : 'text-amber-300'}>
                              {log.newValue.toLocaleString('pt-BR')} {log.unit}
                            </span>
                          </div>

                          {log.difference !== undefined && log.difference !== 0 && (
                            <span
                              className={`text-[10px] font-bold block ${
                                log.difference > 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {log.difference > 0
                                ? `+${log.difference.toLocaleString('pt-BR')} ${log.unit}`
                                : `${log.difference.toLocaleString('pt-BR')} ${log.unit}`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Exibindo <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> registros de auditoria.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

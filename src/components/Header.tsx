import React, { useState, useRef, useEffect } from 'react';
import { Truck, FileSpreadsheet, FileText, PlusCircle, History, RefreshCw, Mail, Wrench, ClipboardList, MoreHorizontal, Clock, Lock, Fuel } from 'lucide-react';
import { Vehicle, MaintenanceRecord } from '../types';
import { exportFleetToExcel, exportFleetToPdf } from '../utils/exportReports';

interface HeaderProps {
  vehicles: Vehicle[];
  history: MaintenanceRecord[];
  changeLogsCount?: number;
  activeView: 'fleet' | 'forecast';
  onViewChange: (view: 'fleet' | 'forecast') => void;
  onOpenAddModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenChangeLog?: () => void;
  onOpenManualMaintenance?: () => void;
  onResetDemoData: () => void;
  onOpenEmailDispatch: () => void;
  onOpenSyncDailySheet: () => void;
  onOpenAbastecimentoSync?: () => void;
  onOpenRevisionCatalog?: (tab?: 'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO') => void;
  onOpenManage8Months?: () => void;
  syncStatus?: 'connected' | 'syncing' | 'offline';
  onForceCloudRefresh?: () => void;
  bgIntensity?: 'balanced' | 'prominent' | 'subtle';
  onCycleBgIntensity?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vehicles,
  history,
  changeLogsCount = 0,
  activeView,
  onViewChange,
  onOpenAddModal,
  onOpenHistoryModal,
  onOpenChangeLog,
  onOpenManualMaintenance,
  onResetDemoData,
  onOpenEmailDispatch,
  onOpenSyncDailySheet,
  onOpenAbastecimentoSync,
  onOpenRevisionCatalog,
  onOpenManage8Months,
  syncStatus = 'connected',
  onForceCloudRefresh,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportExcel = () => {
    exportFleetToExcel(vehicles, history);
    setShowMoreMenu(false);
  };

  const handleExportPdf = () => {
    exportFleetToPdf(vehicles, history);
    setShowMoreMenu(false);
  };

  return (
    <header className="glass-panel border-b border-slate-700/60 sticky top-0 z-30 shadow-xl shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Logo e Identificação Direta */}
          <div className="flex items-center gap-3">
            <div className="h-9 px-2.5 rounded-lg bg-gradient-to-br from-[#002D62] to-[#004F9E] border border-blue-400/30 flex items-center justify-center text-white shrink-0 font-black text-sm tracking-tight">
              MB
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-black text-white tracking-tight">
                  Martin Brower
                </span>
                <span className="text-[10px] font-bold text-sky-300">CD PR</span>
                <span className="text-[11px] text-slate-500">·</span>
                <span className="text-xs text-slate-300 font-mono font-semibold">{vehicles.length} Veículos</span>
                <span className="text-[11px] text-slate-500">·</span>
                {syncStatus === 'syncing' ? (
                  <button
                    onClick={onForceCloudRefresh}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse hover:bg-amber-500/25 transition cursor-pointer"
                    title="Salvando alterações em tempo real no banco de dados em nuvem..."
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />
                    <span>Sincronizando...</span>
                  </button>
                ) : syncStatus === 'offline' ? (
                  <button
                    onClick={onForceCloudRefresh}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition cursor-pointer"
                    title="Clique para tentar reconectar com o banco de dados em nuvem"
                  >
                    <RefreshCw className="w-2.5 h-2.5 text-rose-400" />
                    <span>Reconectar</span>
                  </button>
                ) : (
                  <button
                    onClick={onForceCloudRefresh}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                    title="Sincronização em nuvem ativa! Qualquer alteração sua é transmitida instantaneamente a todos os usuários. Clique para forçar atualização agora."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ao Vivo • Sincronizado</span>
                    <RefreshCw className="w-2 h-2 text-emerald-400 opacity-60 hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Seletor de Telas Resumido */}
          <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onViewChange('fleet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                activeView === 'fleet'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Frota</span>
            </button>

            <button
              onClick={() => onViewChange('forecast')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                activeView === 'forecast'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Previsão Orçamentária</span>
            </button>
          </div>

          {/* Ações Principais e Diretas */}
          <div className="flex items-center gap-1.5">
            {onOpenManualMaintenance && (
              <button
                onClick={onOpenManualMaintenance}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95 cursor-pointer shadow-sm"
                title="Lançar manutenção"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Manutenção</span>
                <span className="sm:hidden">+</span>
              </button>
            )}

            <button
              onClick={onOpenSyncDailySheet}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-800/50 transition cursor-pointer"
              title="Sincronizar planilha diária"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Planilha</span>
            </button>

            {onOpenAbastecimentoSync && (
              <button
                onClick={onOpenAbastecimentoSync}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-800/50 transition cursor-pointer"
                title="Integração em tempo real com o App de Abastecimento (Webhook e Simulador)"
              >
                <Fuel className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Abastecimento</span>
              </button>
            )}

            {onOpenRevisionCatalog && (
              <button
                onClick={() => onOpenRevisionCatalog('REVISAO S')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-600/50 transition cursor-pointer"
                title="Catálogo de Revisões & Preços Oficiais Scania Cotrasa (S, M, L, X)"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Revisões & Preços</span>
                <span className="xl:hidden hidden sm:inline">Preços</span>
              </button>
            )}

            <button
              onClick={onOpenHistoryModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Histórico de revisões"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Histórico ({history.length})</span>
            </button>

            {/* Menu Mais Ações (Exportações, Logs, etc.) */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Mais ações"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs text-slate-200 space-y-0.5 animate-fadeIn">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-emerald-300 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-300 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Exportar PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenEmailDispatch();
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-sky-300 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Disparar E-mail</span>
                  </button>
                  {onOpenChangeLog && (
                    <button
                      onClick={() => {
                        onOpenChangeLog();
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-amber-300 cursor-pointer"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Log Alterações ({changeLogsCount})</span>
                    </button>
                  )}
                  {onOpenAbastecimentoSync && (
                    <button
                      onClick={() => {
                        onOpenAbastecimentoSync();
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-sky-300 cursor-pointer"
                    >
                      <Fuel className="w-3.5 h-3.5" />
                      <span>Integração Abastecimento</span>
                    </button>
                  )}
                  {onOpenRevisionCatalog && (
                    <button
                      onClick={() => {
                        onOpenRevisionCatalog('CICLO');
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-amber-300 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Catálogo Revisões Scania</span>
                    </button>
                  )}
                  {onOpenManage8Months && (
                    <button
                      onClick={() => {
                        onOpenManage8Months();
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-purple-300 hover:text-purple-200 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Gerenciar 8M & Trava KM</span>
                    </button>
                  )}
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => {
                      onOpenAddModal();
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nova Placa</span>
                  </button>
                  <button
                    onClick={() => {
                      onResetDemoData();
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recarregar Base Oficial</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

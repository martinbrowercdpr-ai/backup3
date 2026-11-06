import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Truck,
  Container,
  Snowflake,
  Gauge,
  Clock,
  Wrench,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Calendar,
  Eye,
  FileSpreadsheet,
  FileText,
  Mail,
  Layers,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { Vehicle, VehicleType, AlertLevel, FilterOptions } from '../types';
import {
  calculateAlert,
  getAlertBadgeClasses,
  formatMeter,
  getVehicleTypeLabel,
  isTimeBasedCavalo,
  isVehicleTimeBased,
  isTkFilter500hPlate,
  isTkFilter1000hPlate,
  isCarreta30k,
  isCarreta50k,
  getCarretaIntervalKm,
  formatDatePtBr,
} from '../utils/maintenanceCalculations';
import { SCANIA_REVISIONS_CATALOG, ScaniaRevisionDetail } from '../data/scaniaRevisionCatalog';
import { Manage8MonthsModal } from './Manage8MonthsModal';

interface FleetListProps {
  vehicles: Vehicle[];
  filterOptions: FilterOptions;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  onOpenUpdateMeter: (vehicle: Vehicle) => void;
  onOpenRegisterMaintenance: (vehicle: Vehicle) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onOpenAddModal: () => void;
  onOpenManualMaintenance?: () => void;
  onOpenEmailDispatch?: () => void;
  onOpenSyncDailySheet?: () => void;
  onOpenChangeLog?: () => void;
  onDeleteVehicle?: (vehicleId: string) => void;
  onClearTkHistory?: () => void;
  onClearCarretaHistory?: () => void;
  onOpenRevisionCatalog?: (tab?: 'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO') => void;
  onToggleVehicleTimeBased?: (plate: string, enable?: boolean) => void;
  onResetTimeBasedToDefault?: () => void;
  onUpdateCavaloTaraKm?: (plateOrAll: string | 'ALL', newTaraKm: number) => void;
}

export const FleetList: React.FC<FleetListProps> = ({
  vehicles,
  filterOptions,
  setFilterOptions,
  onOpenUpdateMeter,
  onOpenRegisterMaintenance,
  onSelectVehicle,
  onOpenAddModal,
  onOpenManualMaintenance,
  onOpenEmailDispatch,
  onOpenSyncDailySheet,
  onOpenChangeLog,
  onDeleteVehicle,
  onClearTkHistory,
  onClearCarretaHistory,
  onOpenRevisionCatalog,
  onToggleVehicleTimeBased,
  onResetTimeBasedToDefault,
  onUpdateCavaloTaraKm,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [onlyTimeBased, setOnlyTimeBased] = useState<boolean>(false);
  const [isManage8MonthsOpen, setIsManage8MonthsOpen] = useState<boolean>(false);
  const [onlyTk500h, setOnlyTk500h] = useState<boolean>(false);
  const [onlyTk1000h, setOnlyTk1000h] = useState<boolean>(false);
  const [onlyTk1500h, setOnlyTk1500h] = useState<boolean>(false);
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isConfirmingClearTk, setIsConfirmingClearTk] = useState<boolean>(false);
  const [isConfirmingClearCarreta, setIsConfirmingClearCarreta] = useState<boolean>(false);

  // Filtragem e ordenação
  const filteredVehicles = vehicles
    .filter((v) => {
      // Filtro por Porte/Eixos
      if (sizeFilter !== 'all') {
        if (sizeFilter === 'PEQUENA' && v.bodySize !== 'PEQUENA') return false;
        if (sizeFilter === 'GRANDE' && v.bodySize !== 'GRANDE') return false;
        if (sizeFilter === 'BITRUCK' && v.bodySize !== 'BITRUCK') return false;
        if (sizeFilter === 'TRUCK' && v.bodySize !== 'TRUCK') return false;
        if (sizeFilter === 'VUC' && v.bodySize !== 'VUC') return false;
        if (sizeFilter === '2 EIXOS' && v.axlesConfig !== '2 EIXOS') return false;
        if (sizeFilter === '3 EIXOS' && v.axlesConfig !== '3 EIXOS') return false;
        if (sizeFilter === 'TOCO' && v.axlesConfig !== 'TOCO') return false;
      }

      // Filtro especial para os Cavalos com regra temporal de 8 meses
      if (onlyTimeBased) {
        const isTime = isVehicleTimeBased(v);
        if (!isTime) return false;
      }

      // Filtro especial para os 6 TKs com regra de troca de filtro de 500 horas
      if (onlyTk500h) {
        const isTk500 = v.type === 'tk' && (v.isTk500hFilterRule || isTkFilter500hPlate(v.plate) || (v.fleetNumber && isTkFilter500hPlate(v.fleetNumber)));
        if (!isTk500) return false;
      }

      // Filtro especial para a placa com regra de troca de filtro de 1.000 horas (EQF-4590)
      if (onlyTk1000h) {
        const isTk1000 = v.type === 'tk' && (v.isTk1000hFilterRule || isTkFilter1000hPlate(v.plate) || (v.fleetNumber && isTkFilter1000hPlate(v.fleetNumber)));
        if (!isTk1000) return false;
      }

      // Filtro especial para os TKs padrão (sem regra especial de 500h ou 1000h)
      if (onlyTk1500h) {
        const isSpecialFilter = v.type === 'tk' && (
          v.isTk500hFilterRule ||
          isTkFilter500hPlate(v.plate) ||
          (v.fleetNumber && isTkFilter500hPlate(v.fleetNumber)) ||
          v.isTk1000hFilterRule ||
          isTkFilter1000hPlate(v.plate) ||
          (v.fleetNumber && isTkFilter1000hPlate(v.fleetNumber))
        );
        if (v.type !== 'tk' || isSpecialFilter) return false;
      }

      // Busca textual inteligente (com ou sem traço na placa)
      const query = filterOptions.search.toLowerCase().trim();
      if (query) {
        const cleanQuery = query.replace(/[^a-z0-9]/g, '');
        const cleanPlate = (v.plate || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCoupledTk = (v.coupledTkPlate || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCoupledCarreta = (v.coupledCarretaPlate || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const matchesPlate =
          (v.plate || '').toLowerCase().includes(query) ||
          (cleanQuery.length > 0 && cleanPlate.includes(cleanQuery));
        const matchesFleet = (v.fleetNumber || '').toLowerCase().includes(query);
        const matchesType = (v.type === 'cavalo' ? 'cavalo mecânico caminhão' : v.type === 'tk' ? 'thermo king' : 'carreta semirreboque').includes(query);
        const matchesRevision = (v.nextRevisionType || '').toLowerCase().includes(query);
        const matchesCoupled = Boolean(
          v.coupledCarretaPlate?.toLowerCase().includes(query) ||
          v.coupledTkPlate?.toLowerCase().includes(query) ||
          (cleanQuery.length > 0 && (cleanCoupledTk.includes(cleanQuery) || cleanCoupledCarreta.includes(cleanQuery)))
        );
        if (!matchesPlate && !matchesFleet && !matchesType && !matchesRevision && !matchesCoupled) {
          return false;
        }
      }

      // Filtro por tipo
      if (filterOptions.type !== 'all' && v.type !== filterOptions.type) {
        return false;
      }

      // Filtro por nível de alerta
      const alert = calculateAlert(v);
      if (filterOptions.alertLevel !== 'all' && alert.level !== filterOptions.alertLevel) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Regra explícita solicitada pelo usuário: "DEIXE AS PLACAS NA ABA CAVALO/CARRETA/TK EM ORDEM ALFABETICA"
      if (filterOptions.type === 'cavalo' || filterOptions.type === 'carreta' || filterOptions.type === 'tk') {
        if (filterOptions.sortBy === 'meter') {
          return filterOptions.sortDirection === 'asc'
            ? a.currentMeter - b.currentMeter
            : b.currentMeter - a.currentMeter;
        }
        if (filterOptions.sortBy === 'urgency') {
          const alertA = calculateAlert(a);
          const alertB = calculateAlert(b);
          const priorityOrder: Record<AlertLevel, number> = { critical: 1, warning: 2, ok: 3 };
          const priorityDiff = priorityOrder[alertA.level] - priorityOrder[alertB.level];
          if (priorityDiff !== 0) return priorityDiff;
          return alertA.difference - alertB.difference;
        }
        // Padrão nas abas específicas: sempre ordem alfabética da placa A-Z
        return filterOptions.sortDirection === 'desc'
          ? b.plate.localeCompare(a.plate)
          : a.plate.localeCompare(b.plate);
      }

      const alertA = calculateAlert(a);
      const alertB = calculateAlert(b);

      // Prioridade por criticidade (vencidas primeiro)
      const priorityOrder: Record<AlertLevel, number> = { critical: 1, warning: 2, ok: 3 };

      if (filterOptions.sortBy === 'urgency') {
        const priorityDiff = priorityOrder[alertA.level] - priorityOrder[alertB.level];
        if (priorityDiff !== 0) return priorityDiff;
        // Se ambos estiverem no mesmo nível, menor diferença (mais próximo da revisão) vem primeiro
        return alertA.difference - alertB.difference;
      }

      if (filterOptions.sortBy === 'plate') {
        return filterOptions.sortDirection === 'desc'
          ? b.plate.localeCompare(a.plate)
          : a.plate.localeCompare(b.plate);
      }

      if (filterOptions.sortBy === 'meter') {
        return filterOptions.sortDirection === 'asc'
          ? a.currentMeter - b.currentMeter
          : b.currentMeter - a.currentMeter;
      }

      return a.plate.localeCompare(b.plate);
    });

  const getTypeIcon = (type: VehicleType) => {
    switch (type) {
      case 'cavalo':
        return <Truck className="w-3.5 h-3.5 text-sky-400" />;
      case 'carreta':
        return <Container className="w-3.5 h-3.5 text-amber-400" />;
      case 'tk':
        return <Snowflake className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const countCavalos = vehicles.filter((v) => v.type === 'cavalo').length;
  const countCarretas = vehicles.filter((v) => v.type === 'carreta').length;
  const countTks = vehicles.filter((v) => v.type === 'tk').length;

  const countCavalos8Meses = vehicles.filter(
    (v) => isVehicleTimeBased(v)
  ).length;

  const countTk500h = vehicles.filter(
    (v) => v.type === 'tk' && (v.isTk500hFilterRule || isTkFilter500hPlate(v.plate) || (v.fleetNumber && isTkFilter500hPlate(v.fleetNumber)))
  ).length;

  const countTk1000h = vehicles.filter(
    (v) => v.type === 'tk' && (v.isTk1000hFilterRule || isTkFilter1000hPlate(v.plate) || (v.fleetNumber && isTkFilter1000hPlate(v.fleetNumber)))
  ).length;

  const countTk1500h = countTks;

  const countCritical = vehicles.filter((v) => calculateAlert(v).level === 'critical').length;
  const countWarning = vehicles.filter((v) => calculateAlert(v).level === 'warning').length;
  const countOk = vehicles.filter((v) => calculateAlert(v).level === 'ok').length;

  return (
    <div className="space-y-4">
      {/* Barra de Controles Resumida e Direta */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 border border-slate-700/60 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-input"
              value={filterOptions.search}
              onChange={(e) =>
                setFilterOptions({ ...filterOptions, search: e.target.value })
              }
              placeholder="Buscar por placa, frota ou revisão..."
              className="w-full pl-9 pr-9 py-1.5 glass-input border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono"
            />
            {filterOptions.search && (
              <button
                onClick={() => setFilterOptions({ ...filterOptions, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Abas Principais: CAVALOS | CARRETAS | TKS */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            {/* Cavalos */}
            <button
              id="filter-tab-cavalo"
              onClick={() => {
                setOnlyTimeBased(false);
                setOnlyTk500h(false);
                setOnlyTk1500h(false);
                setFilterOptions({
                  ...filterOptions,
                  type: 'cavalo',
                  sortBy: 'plate',
                  sortDirection: 'asc',
                });
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                !onlyTimeBased && !onlyTk500h && !onlyTk1500h && filterOptions.type === 'cavalo'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Cavalos ({countCavalos})</span>
            </button>

            {/* Carretas */}
            <button
              id="filter-tab-carretas"
              onClick={() => {
                setOnlyTimeBased(false);
                setOnlyTk500h(false);
                setOnlyTk1500h(false);
                setFilterOptions({ ...filterOptions, type: 'carreta' });
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                !onlyTimeBased && !onlyTk500h && !onlyTk1500h && filterOptions.type === 'carreta'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Container className="w-3.5 h-3.5" />
              <span>Carretas ({countCarretas})</span>
            </button>

            {/* TKs */}
            <button
              id="filter-tab-tks"
              onClick={() => {
                setOnlyTimeBased(false);
                setOnlyTk500h(false);
                setOnlyTk1500h(false);
                setFilterOptions({ ...filterOptions, type: 'tk' });
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                !onlyTimeBased && !onlyTk500h && !onlyTk1500h && filterOptions.type === 'tk'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>TKs ({countTks})</span>
            </button>
          </div>

          {/* Alternador Cards / Tabela & Ações Diretas */}
          <div className="flex items-center gap-1.5 self-end lg:self-auto">
            <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tabela
              </button>
            </div>

            <button
              onClick={onOpenAddModal}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition shadow-sm cursor-pointer"
              title="Cadastrar nova placa"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Placa</span>
            </button>
          </div>
        </div>

        {/* Linha Resumida de Subfiltros e Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
          {/* Status (Todos, Vencidas, Atenção, Em Dia) */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setFilterOptions({ ...filterOptions, alertLevel: 'all' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                filterOptions.alertLevel === 'all'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({vehicles.length})
            </button>
            <button
              onClick={() => setFilterOptions({ ...filterOptions, alertLevel: 'critical' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1 ${
                filterOptions.alertLevel === 'critical'
                  ? 'bg-rose-950 text-rose-200 font-bold border border-rose-700 ring-1 ring-rose-500/40'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Vencidas ({countCritical})</span>
            </button>
            <button
              onClick={() => setFilterOptions({ ...filterOptions, alertLevel: 'warning' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1 ${
                filterOptions.alertLevel === 'warning'
                  ? 'bg-amber-950 text-amber-200 font-bold border border-amber-700 ring-1 ring-amber-500/40'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Atenção ({countWarning})</span>
            </button>
            <button
              onClick={() => setFilterOptions({ ...filterOptions, alertLevel: 'ok' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1 ${
                filterOptions.alertLevel === 'ok'
                  ? 'bg-emerald-950 text-emerald-200 font-bold border border-emerald-700 ring-1 ring-emerald-500/40'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Em Dia ({countOk})</span>
            </button>
          </div>

          {/* Subfiltros Contextuais Diretos (Cavalos 8m / TK 1.500h / TK 500h) */}
          <div className="flex items-center gap-1">
            {filterOptions.type === 'cavalo' && (
              <>
                <button
                  onClick={() => setOnlyTimeBased(!onlyTimeBased)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    onlyTimeBased
                      ? 'bg-purple-500 text-white font-bold shadow-xs ring-1 ring-purple-300'
                      : 'text-purple-300 hover:text-purple-200 bg-purple-950/40 border border-purple-900/40'
                  }`}
                >
                  <Clock className="w-3 h-3 text-purple-300" />
                  <span>8 Meses ({countCavalos8Meses})</span>
                </button>

                <button
                  type="button"
                  id="btn-manage-8months-and-trava"
                  onClick={() => setIsManage8MonthsOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-200 hover:text-white bg-gradient-to-r from-purple-950/80 via-purple-900/60 to-amber-950/60 hover:from-purple-900 hover:to-amber-900 border border-amber-500/50 hover:border-amber-400 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Mudar a trava dos KMs rodados para todo cavalo ou gerenciar regra temporal de 8 meses"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gerenciar 8 Meses & Trava KM</span>
                </button>

                {onOpenRevisionCatalog && (
                  <button
                    onClick={() => onOpenRevisionCatalog('REVISAO S')}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/50 transition cursor-pointer flex items-center gap-1"
                    title="O que cada revisão faz, preços oficiais Scania e regra da trava de 40.000 KM"
                  >
                    <Wrench className="w-3 h-3 text-amber-400" />
                    <span>O que cada Revisão Faz (Preços)</span>
                  </button>
                )}
              </>
            )}

            {filterOptions.type === 'tk' && (
              <>
                <button
                  onClick={() => {
                    setOnlyTk500h(false);
                    setOnlyTk1000h(false);
                    setOnlyTk1500h(!onlyTk1500h);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    onlyTk1500h
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                      : 'text-cyan-300 hover:text-white bg-cyan-950/40 border border-cyan-800/60'
                  }`}
                  title="Todos os TKs têm trava de 1.500 Horas"
                >
                  <Wrench className="w-3 h-3 text-cyan-300" />
                  <span>1.500h Geral ({countTk1500h})</span>
                </button>
                <button
                  onClick={() => {
                    setOnlyTk1500h(false);
                    setOnlyTk1000h(false);
                    setOnlyTk500h(!onlyTk500h);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    onlyTk500h
                      ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                      : 'text-cyan-300 hover:text-white bg-cyan-950/40 border border-cyan-800/60'
                  }`}
                  title="6 Placas com Troca de Filtros aos 500H (Alerta em Atenção)"
                >
                  <Snowflake className="w-3 h-3 text-cyan-300" />
                  <span>500h Filtro ({countTk500h})</span>
                </button>
                <button
                  onClick={() => {
                    setOnlyTk1500h(false);
                    setOnlyTk500h(false);
                    setOnlyTk1000h(!onlyTk1000h);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    onlyTk1000h
                      ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                      : 'text-cyan-300 hover:text-white bg-cyan-950/40 border border-cyan-800/60'
                  }`}
                  title="1 Placa com Troca de Filtros aos 1.000H (EQF-4590)"
                >
                  <Snowflake className="w-3 h-3 text-cyan-300" />
                  <span>1.000h Filtro ({countTk1000h})</span>
                </button>
              </>
            )}

            <span className="text-slate-500 text-[11px] font-mono ml-2">
              {filteredVehicles.length} placas
            </span>
          </div>
        </div>
      </div>

      {/* Lista ou Grid de Veículos */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-300">Nenhum veículo encontrado</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Nenhuma unidade corresponde aos filtros ativos. Tente redefinir a busca ou adicione uma nova placa.
          </p>
          <button
            onClick={() => {
              setOnlyTimeBased(false);
              setFilterOptions({
                search: '',
                type: 'all',
                alertLevel: 'all',
                status: 'all',
                sortBy: 'urgency',
                sortDirection: 'asc',
              });
            }}
            className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Visualização em Grid de Cards Resumidos e Diretos */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVehicles.map((vehicle) => {
            const alert = calculateAlert(vehicle);
            const badge = getAlertBadgeClasses(alert.level);
            const isHours = vehicle.meterUnit === 'HORAS';
            const isTime = isVehicleTimeBased(vehicle);
            const isTk500h =
              vehicle.type === 'tk' &&
              (vehicle.isTk500hFilterRule || isTkFilter500hPlate(vehicle.plate));
            const isTk1000h =
              vehicle.type === 'tk' &&
              (vehicle.isTk1000hFilterRule || isTkFilter1000hPlate(vehicle.plate));
            const isCrt50k = isCarreta50k(vehicle.plate) || vehicle.nextRevisionType?.includes('50.000') || vehicle.carretaTaraKm === 50000;
            const isOutOfRoute = vehicle.status === 'inactive' || vehicle.observations?.includes('FORA DE ROTA');

            return (
              <div
                key={vehicle.id}
                id={`vehicle-card-${vehicle.plate.replace(/[^a-zA-Z0-9]/g, '')}`}
                className={`glass-card rounded-xl border transition-all duration-150 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                  alert.level === 'critical'
                    ? 'border-rose-500/60 bg-rose-950/20'
                    : alert.level === 'warning'
                    ? 'border-amber-500/60 bg-amber-950/20'
                    : 'border-slate-800/90 hover:border-slate-700 bg-slate-950/60'
                }`}
              >
                {/* Cabeçalho do Card Direto */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    {/* Placa + Categoria */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded bg-slate-800 text-slate-300">
                          {getTypeIcon(vehicle.type)}
                        </span>
                        <span className="font-mono font-black text-sm text-white tracking-wider">
                          {vehicle.plate}
                        </span>
                      </div>
                      {vehicle.fleetNumber && vehicle.fleetNumber !== vehicle.plate && (
                        <span className="text-[11px] font-mono text-slate-400">
                          ({vehicle.fleetNumber})
                        </span>
                      )}
                    </div>

                    {/* Badge de Status e Tags de Regra */}
                    <div className="flex items-center gap-1">
                      {isTime ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVehicleTimeBased?.(vehicle.plate, false);
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 hover:bg-rose-950/60 text-purple-300 hover:text-rose-300 border border-purple-500/40 hover:border-rose-500/40 transition cursor-pointer"
                          title="⏱️ Regra de 8 Meses ativa. Clique para desmarcar sem recadastrar."
                        >
                          8M
                        </button>
                      ) : vehicle.type === 'cavalo' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVehicleTimeBased?.(vehicle.plate, true);
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800/80 hover:bg-purple-900/40 text-slate-400 hover:text-purple-300 border border-slate-700/60 hover:border-purple-500/40 transition cursor-pointer opacity-70 hover:opacity-100"
                          title="Clique para ativar a Regra de 8 Meses para esta placa."
                        >
                          +8M
                        </button>
                      ) : null}
                      {isTk500h && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" title="Troca de filtro 500h">
                          500h
                        </span>
                      )}
                      {isTk1000h && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" title="Troca de filtro 1.000h (EQF-4590)">
                          1.000h
                        </span>
                      )}
                      {vehicle.type === 'carreta' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40" title="Trava 60.000 KM • Atenção aos 50.000 KM">
                          Trava 60K
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg} ${badge.text} ${badge.border} shrink-0`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.indicator}`}></span>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Números Principais: Medição Atual & Meta Prevista */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {isHours ? 'Horímetro Atual' : 'Odômetro Atual'}
                      </span>
                      <span className="font-mono font-black text-sm text-white block mt-0.5">
                        {isOutOfRoute ? (
                          <span className="text-amber-400 font-bold text-xs">FORA DE ROTA</span>
                        ) : (
                          formatMeter(vehicle.currentMeter, vehicle.meterUnit)
                        )}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Meta Revisão</span>
                      <span className="font-mono font-bold text-slate-200 block mt-0.5">
                        {vehicle.type === 'carreta'
                          ? `${(vehicle.carretaTaraKm || 60000).toLocaleString('pt-BR')} KM`
                          : formatMeter(vehicle.nextRevisionMeter, vehicle.meterUnit)}
                      </span>
                    </div>
                  </div>

                  {/* Próxima Revisão e Saldo Operacional */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[170px]" title={vehicle.nextRevisionType}>
                        {vehicle.nextRevisionType}
                      </span>
                      <span
                        className={`font-mono font-bold text-[11px] shrink-0 ${
                          alert.level === 'critical'
                            ? 'text-rose-400'
                            : alert.level === 'warning'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {alert.message}
                      </span>
                    </div>

                    {/* Barra de Progresso Fina */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          alert.level === 'critical'
                            ? 'bg-rose-500'
                            : alert.level === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, alert.percentUsed))}%` }}
                      />
                    </div>

                    {/* Preço Oficial e Resumo da Revisão Scania Cotrasa (para Cavalos) */}
                    {vehicle.type === 'cavalo' && (() => {
                      const t = vehicle.nextRevisionType || 'REVISAO S';
                      const k = t.includes('L') ? 'REVISAO L' : t.includes('M') ? 'REVISAO M' : t.includes('X') ? 'REVISAO X' : 'REVISAO S';
                      const det: ScaniaRevisionDetail | undefined = SCANIA_REVISIONS_CATALOG[k];
                      if (!det) return null;
                      return (
                        <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-900/50 flex items-center justify-between text-[11px] mt-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-slate-300 font-semibold truncate">{det.id}:</span>
                            <span className="font-mono font-bold text-emerald-400 shrink-0">
                              {det.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                          {onOpenRevisionCatalog && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRevisionCatalog(det.id);
                              }}
                              className="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline shrink-0 cursor-pointer ml-1"
                              title="Ver o que a revisão faz e espelho do orçamento Cotrasa"
                            >
                              O que faz?
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Ações do Card: Diretas e Rápidas */}
                <div className="bg-slate-950/90 p-2.5 border-t border-slate-800 flex items-center justify-between gap-1.5 text-xs">
                  <button
                    onClick={() => onOpenUpdateMeter(vehicle)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                    title={`Atualizar ${vehicle.meterUnit}`}
                  >
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>Atualizar</span>
                  </button>

                  <button
                    onClick={() => onOpenRegisterMaintenance(vehicle)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                    title="Registrar revisão realizada"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Revisar</span>
                  </button>

                  <button
                    onClick={() => onSelectVehicle(vehicle)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Ver detalhes e histórico completo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {onDeleteVehicle && (
                    <button
                      onClick={() => setVehicleToDelete(vehicle)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-700/60 transition cursor-pointer"
                      title={`Excluir placa ${vehicle.plate}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização em Tabela Operacional Direta */
        <div className="glass-panel border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Placa / Frota</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Medição Atual</th>
                  <th className="py-2.5 px-3">Próxima Revisão</th>
                  <th className="py-2.5 px-3">Meta Programada</th>
                  <th className="py-2.5 px-3">Situação</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVehicles.map((vehicle) => {
                  const alert = calculateAlert(vehicle);
                  const badge = getAlertBadgeClasses(alert.level);
                  const isTime = isVehicleTimeBased(vehicle);
                  const isTk500h =
                    vehicle.type === 'tk' &&
                    (vehicle.isTk500hFilterRule || isTkFilter500hPlate(vehicle.plate));
                  const isTk1000h =
                    vehicle.type === 'tk' &&
                    (vehicle.isTk1000hFilterRule || isTkFilter1000hPlate(vehicle.plate));
                  const isCrt50k = isCarreta50k(vehicle.plate) || vehicle.nextRevisionType?.includes('50.000') || vehicle.carretaTaraKm === 50000;
                  const isOutOfRoute = vehicle.status === 'inactive' || vehicle.observations?.includes('FORA DE ROTA');

                  return (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-slate-800/40 transition"
                    >
                      {/* Placa */}
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{vehicle.plate}</span>
                          {vehicle.fleetNumber && vehicle.fleetNumber !== vehicle.plate && (
                            <span className="text-slate-400 text-[11px]">({vehicle.fleetNumber})</span>
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-2.5 px-3">
                        <span className="flex items-center gap-1 text-slate-300">
                          {getTypeIcon(vehicle.type)}
                          <span className="capitalize">{vehicle.type}</span>
                          {isTime ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleVehicleTimeBased?.(vehicle.plate, false);
                              }}
                              className="text-[9px] font-bold text-purple-300 hover:text-rose-300 bg-purple-950/60 hover:bg-rose-950/60 px-1.5 py-0.2 rounded border border-purple-800/60 hover:border-rose-800/60 transition cursor-pointer"
                              title="⏱️ Regra de 8 Meses ativa. Clique para desmarcar sem recadastrar."
                            >
                              8M
                            </button>
                          ) : vehicle.type === 'cavalo' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleVehicleTimeBased?.(vehicle.plate, true);
                              }}
                              className="text-[9px] font-semibold text-slate-400 hover:text-purple-300 bg-slate-800 hover:bg-purple-900/40 px-1 py-0.2 rounded border border-slate-700 hover:border-purple-600/40 transition cursor-pointer opacity-70 hover:opacity-100"
                              title="Clique para ativar a regra de 8 meses para esta placa."
                            >
                              +8M
                            </button>
                          ) : null}
                          {isTk500h && <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/60 px-1 rounded" title="Troca de Filtro 500H">500h</span>}
                          {isTk1000h && <span className="text-[9px] font-bold text-indigo-300 bg-indigo-950/60 px-1 rounded" title="Troca de Filtro 1.000H (EQF-4590)">1.000h</span>}
                          {vehicle.type === 'carreta' && (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-1 rounded">
                              {isCrt50k ? '50K' : '30K'}
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Medição Atual */}
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {isOutOfRoute ? (
                          <span className="text-amber-400 font-bold text-[11px]">FORA DE ROTA</span>
                        ) : (
                          formatMeter(vehicle.currentMeter, vehicle.meterUnit)
                        )}
                      </td>

                      {/* Próxima Revisão */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-amber-300">{vehicle.nextRevisionType}</span>
                          {vehicle.type === 'cavalo' && (() => {
                            const t = vehicle.nextRevisionType || 'REVISAO S';
                            const k = t.includes('L') ? 'REVISAO L' : t.includes('M') ? 'REVISAO M' : t.includes('X') ? 'REVISAO X' : 'REVISAO S';
                            const det = SCANIA_REVISIONS_CATALOG[k];
                            if (!det) return null;
                            return (
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="font-mono font-bold text-emerald-400">
                                  {det.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                {onOpenRevisionCatalog && (
                                  <button
                                    onClick={() => onOpenRevisionCatalog(det.id)}
                                    className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
                                    title="Ver o que a revisão faz"
                                  >
                                    (o que faz?)
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Meta Programada */}
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {vehicle.type === 'carreta'
                          ? `${(vehicle.carretaTaraKm || 60000).toLocaleString('pt-BR')} KM`
                          : formatMeter(vehicle.nextRevisionMeter, vehicle.meterUnit)}
                      </td>

                      {/* Situação */}
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1 h-1 rounded-full ${badge.indicator}`}></span>
                          {badge.label}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onOpenUpdateMeter(vehicle)}
                            className="px-2 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition cursor-pointer"
                            title={`Atualizar ${vehicle.meterUnit}`}
                          >
                            Atualizar
                          </button>
                          <button
                            onClick={() => onOpenRegisterMaintenance(vehicle)}
                            className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition cursor-pointer"
                            title="Revisar"
                          >
                            Revisar
                          </button>
                          <button
                            onClick={() => onSelectVehicle(vehicle)}
                            className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                            title="Detalhes"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          {onDeleteVehicle && (
                            <button
                              onClick={() => setVehicleToDelete(vehicle)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                              title={`Excluir placa ${vehicle.plate}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Placa da Frota */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel border border-rose-700/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950 flex items-center justify-center border border-rose-800 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Placa {vehicleToDelete.plate}?</h3>
                <p className="text-xs text-slate-400">
                  Esta ação removerá a unidade ({vehicleToDelete.type.toUpperCase()}) da frota ativa e de todas as previsões.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Placa Oficial:</span>
                <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {vehicleToDelete.plate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Categoria:</span>
                <span className="capitalize">{getVehicleTypeLabel(vehicleToDelete.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Medição Registrada:</span>
                <span className="font-mono text-amber-300">
                  {formatMeter(vehicleToDelete.currentMeter, vehicleToDelete.meterUnit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Próxima Revisão:</span>
                <span className="font-bold text-slate-200">{vehicleToDelete.nextRevisionType}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setVehicleToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteVehicle) {
                    onDeleteVehicle(vehicleToDelete.id);
                  }
                  setVehicleToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-950/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir Placa
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
                  Esta ação removerá todos os registros de manutenções das carretas.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <p>Você pode restaurar as revisões oficiais a qualquer momento no modal de Histórico.</p>
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
      {/* Modal para Gerenciar Placas de 8 Meses */}
      {isManage8MonthsOpen && onToggleVehicleTimeBased && (
        <Manage8MonthsModal
          isOpen={isManage8MonthsOpen}
          onClose={() => setIsManage8MonthsOpen(false)}
          vehicles={vehicles}
          onToggleTimeBased={onToggleVehicleTimeBased}
          onResetToDefault={onResetTimeBasedToDefault}
          onUpdateCavaloTaraKm={onUpdateCavaloTaraKm}
        />
      )}
    </div>
  );
};

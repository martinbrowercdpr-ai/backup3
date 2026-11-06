import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Layers,
  Truck,
  Container,
  Snowflake,
} from 'lucide-react';
import { Vehicle, VehicleType, AlertLevel } from '../types';
import { calculateAlert, isTimeBasedCavalo, isVehicleTimeBased, isTkFilter500hPlate } from '../utils/maintenanceCalculations';

interface DashboardStatsProps {
  vehicles: Vehicle[];
  activeType: 'all' | VehicleType;
  activeAlertLevel: 'all' | AlertLevel;
  onFilterType: (type: 'all' | VehicleType) => void;
  onFilterAlert: (level: 'all' | AlertLevel) => void;
  onFilter8Months?: () => void;
  only8MonthsActive?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  vehicles,
  activeType,
  activeAlertLevel,
  onFilterType,
  onFilterAlert,
}) => {
  const alerts = vehicles.map((v) => calculateAlert(v));
  const criticalCount = alerts.filter((a) => a.level === 'critical').length;
  const warningCount = alerts.filter((a) => a.level === 'warning').length;
  const okCount = alerts.filter((a) => a.level === 'ok').length;

  const total = vehicles.length || 1;
  const criticalPercent = ((criticalCount / total) * 100).toFixed(0);
  const warningPercent = ((warningCount / total) * 100).toFixed(0);
  const okPercent = ((okCount / total) * 100).toFixed(0);

  const cavalos = vehicles.filter((v) => v.type === 'cavalo');
  const carretas = vehicles.filter((v) => v.type === 'carreta');
  const tks = vehicles.filter((v) => v.type === 'tk');

  const count8Meses = cavalos.filter((v) => isVehicleTimeBased(v)).length;
  const tk500hCount = tks.filter((v) => isTkFilter500hPlate(v.plate) || (v.fleetNumber && isTkFilter500hPlate(v.fleetNumber))).length;
  const tk1500hCount = tks.length - tk500hCount;

  return (
    <div className="space-y-3">
      {/* 4 Cards de Indicadores Rápidos e Diretos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Frota */}
        <button
          type="button"
          onClick={() => onFilterAlert('all')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between group ${
            activeAlertLevel === 'all'
              ? 'bg-slate-900 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Frota
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
                {vehicles.length}
              </span>
              <span className="text-[11px] text-slate-400">unidades</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {cavalos.length} Cav · {carretas.length} Crt · {tks.length} TK
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </button>

        {/* Revisões Em Dia */}
        <button
          type="button"
          onClick={() => onFilterAlert(activeAlertLevel === 'ok' ? 'all' : 'ok')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between group ${
            activeAlertLevel === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
              : 'bg-slate-950/70 border-slate-800 hover:border-emerald-800/60 hover:bg-slate-900/60'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Em Dia
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
                {okCount}
              </span>
              <span className="text-[11px] font-mono text-emerald-300">({okPercent}%)</span>
            </div>
            <p className="text-[10px] text-slate-400">Sem pendências</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </button>

        {/* Próximas de Vencer (Atenção) */}
        <button
          type="button"
          onClick={() => onFilterAlert(activeAlertLevel === 'warning' ? 'all' : 'warning')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between group ${
            activeAlertLevel === 'warning'
              ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500/40'
              : 'bg-slate-950/70 border-slate-800 hover:border-amber-800/60 hover:bg-slate-900/60'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Atenção
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
                {warningCount}
              </span>
              <span className="text-[11px] font-mono text-amber-300">({warningPercent}%)</span>
            </div>
            <p className="text-[10px] text-slate-400">Revisão próxima</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </button>

        {/* Vencidas (Crítico) */}
        <button
          type="button"
          onClick={() => onFilterAlert(activeAlertLevel === 'critical' ? 'all' : 'critical')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between group ${
            activeAlertLevel === 'critical'
              ? 'bg-rose-950/70 border-rose-500 shadow-md ring-1 ring-rose-500/50'
              : 'bg-slate-950/70 border-slate-800 hover:border-rose-800/60 hover:bg-slate-900/60'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Vencidas
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tabular-nums">
                {criticalCount}
              </span>
              <span className="text-[11px] font-mono text-rose-300">({criticalPercent}%)</span>
            </div>
            <p className="text-[10px] text-rose-300/80">Parada prioritária</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-950/80 text-rose-400 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Barra Direta de Categorias (Cavalos · Carretas · TKs) */}
      <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onFilterType('cavalo')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeType === 'cavalo'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Cavalos ({cavalos.length})</span>
            <span className="text-[10px] opacity-80 font-normal">· {count8Meses} de 8m</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterType('carreta')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeType === 'carreta'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Container className="w-3.5 h-3.5" />
            <span>Carretas ({carretas.length})</span>
            <span className="text-[10px] opacity-80 font-normal">· 30K/50K</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterType('tk')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeType === 'tk'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>TKs ({tks.length})</span>
            <span className="text-[10px] opacity-80 font-normal">· {tk1500hCount} (1.500h) · {tk500hCount} (500h)</span>
          </button>
        </div>

        {/* Barra de Distribuição Compacta */}
        <div className="hidden md:flex items-center gap-2 shrink-0 pr-1">
          <span className="text-[11px] text-slate-400">Saúde:</span>
          <div className="w-36 h-2 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
            <div style={{ width: `${okPercent}%` }} className="bg-emerald-500" title={`Em Dia: ${okCount}`} />
            <div style={{ width: `${warningPercent}%` }} className="bg-amber-500" title={`Atenção: ${warningCount}`} />
            <div style={{ width: `${criticalPercent}%` }} className="bg-rose-500" title={`Vencidas: ${criticalCount}`} />
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-400">{okPercent}% ok</span>
        </div>
      </div>
    </div>
  );
};

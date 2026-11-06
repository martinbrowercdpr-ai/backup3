import React, { useState } from 'react';
import { AlertOctagon, Wrench, ArrowRight } from 'lucide-react';
import { Vehicle } from '../types';
import { calculateAlert } from '../utils/maintenanceCalculations';

interface AlertBannerProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onOpenRegisterMaintenance: (vehicle: Vehicle) => void;
  onFilterCritical?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  vehicles,
  onSelectVehicle,
  onOpenRegisterMaintenance,
  onFilterCritical,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalVehicles = vehicles
    .filter((v) => calculateAlert(v).level === 'critical')
    .sort((a, b) => calculateAlert(a).difference - calculateAlert(b).difference);

  if (criticalVehicles.length === 0) {
    return null;
  }

  const displayedVehicles = isExpanded ? criticalVehicles : criticalVehicles.slice(0, 6);
  const remainingCount = criticalVehicles.length - 6;

  return (
    <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-3 backdrop-blur-md shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-rose-300 uppercase tracking-wide">
            {criticalVehicles.length} {criticalVehicles.length === 1 ? 'Revisão Vencida' : 'Revisões Vencidas'}
          </span>
          <span className="text-[11px] text-slate-400 hidden md:inline">· Parada prioritária</span>
        </div>

        <div className="flex items-center gap-2">
          {onFilterCritical && (
            <button
              onClick={onFilterCritical}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-200 bg-rose-900/60 hover:bg-rose-800 border border-rose-600/50 transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <span>Ver na Lista</span>
              <ArrowRight className="w-3 h-3 text-rose-400" />
            </button>
          )}
          {criticalVehicles.length > 6 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-rose-300 hover:text-white px-2 py-0.5 rounded transition cursor-pointer font-medium"
            >
              {isExpanded ? 'Recolher' : `+${remainingCount} outras`}
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-rose-900/40 flex flex-wrap gap-1.5 items-center">
        {displayedVehicles.map((v) => {
          const alert = calculateAlert(v);
          const overdue = Math.abs(alert.difference);
          const unit = alert.isTimeBased ? 'dias' : v.meterUnit;

          return (
            <div
              key={v.id}
              onClick={() => onSelectVehicle(v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-rose-800/60 hover:border-rose-500 text-xs font-mono cursor-pointer transition group"
              title={`${v.plate}: ${v.nextRevisionType}. Clique para detalhes.`}
            >
              <span className="font-bold text-white group-hover:text-amber-400">{v.plate}</span>
              <span className="text-rose-400 text-[11px] font-semibold">
                +{overdue.toLocaleString('pt-BR')} {unit}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRegisterMaintenance(v);
                }}
                className="ml-1 p-0.5 text-slate-400 hover:text-emerald-400 transition"
                title="Lançar revisão"
              >
                <Wrench className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

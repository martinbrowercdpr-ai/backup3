import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Search,
  Check,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Gauge,
  SlidersHorizontal,
  Lock,
  Zap,
  ArrowRight,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { Vehicle } from '../types';
import { isVehicleTimeBased, formatDatePtBr } from '../utils/maintenanceCalculations';

interface Manage8MonthsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onToggleTimeBased: (plate: string, enable?: boolean) => void;
  onResetToDefault?: () => void;
  onUpdateCavaloTaraKm?: (plateOrAll: string | 'ALL', newTaraKm: number) => void;
}

export const Manage8MonthsModal: React.FC<Manage8MonthsModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onToggleTimeBased,
  onResetToDefault,
  onUpdateCavaloTaraKm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | '8m' | 'km'>('all');
  const [editingPlate, setEditingPlate] = useState<string | null>(null);
  const [editingKmInput, setEditingKmInput] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const cavalos = useMemo(
    () =>
      vehicles
        .filter((v) => v.type === 'cavalo')
        .sort((a, b) => a.plate.localeCompare(b.plate)),
    [vehicles]
  );

  // Calcula a trava mais comum / atual dos cavalos
  const dominantTara = useMemo(() => {
    if (cavalos.length === 0) return 40000;
    const counts: Record<number, number> = {};
    cavalos.forEach((c) => {
      const t = c.cavaloTaraKm || 40000;
      counts[t] = (counts[t] || 0) + 1;
    });
    let topTara = 40000;
    let topCount = 0;
    Object.entries(counts).forEach(([tStr, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topTara = Number(tStr);
      }
    });
    return topTara;
  }, [cavalos]);

  const [globalTaraKm, setGlobalTaraKm] = useState<number>(dominantTara);
  const [customTaraInput, setCustomTaraInput] = useState<string>(dominantTara.toString());

  if (!isOpen) return null;

  const countActive = cavalos.filter((v) => isVehicleTimeBased(v)).length;
  const countInactive = cavalos.length - countActive;

  const filteredCavalos = cavalos.filter((v) => {
    const isTime = isVehicleTimeBased(v);
    if (activeFilter === '8m' && !isTime) return false;
    if (activeFilter === 'km' && isTime) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPlate = v.plate.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanFleet = (v.fleetNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanPlate.includes(term) || cleanFleet.includes(term);
  });

  const selectedTargetKm = Math.max(5000, Number(customTaraInput) || globalTaraKm || 40000);
  const selectedAlertKm = Math.round(selectedTargetKm / 2);

  const handleApplyTaraToAll = () => {
    if (onUpdateCavaloTaraKm) {
      onUpdateCavaloTaraKm('ALL', selectedTargetKm);
      setFeedbackMessage(
        `⚡ Trava de ${selectedTargetKm.toLocaleString('pt-BR')} KM aplicada com sucesso para TODOS os ${cavalos.length} cavalos! Alerta intermediário para Revisão X ajustado para ${selectedAlertKm.toLocaleString('pt-BR')} KM.`
      );
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleApplyIndividualTara = (plate: string, km: number) => {
    if (onUpdateCavaloTaraKm) {
      onUpdateCavaloTaraKm(plate, km);
      setFeedbackMessage(
        `✅ Trava de ${km.toLocaleString('pt-BR')} KM aplicada para ${plate}! Alerta intermediário aos ${Math.round(km / 2).toLocaleString('pt-BR')} KM.`
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
    setEditingPlate(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Principal */}
        <div className="p-4 bg-gradient-to-r from-purple-950/80 via-slate-950 to-amber-950/60 border-b border-purple-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shadow-inner">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Gerenciar 8 Meses & Trava de KM • Cavalos Scania
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {countActive} com 8M
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Trava Atual: {dominantTara.toLocaleString('pt-BR')} KM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Altere a regra temporal e a trava dos KMs rodados para todo cavalo quando você quiser.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PAINEL EM DESTAQUE: MUDAR A TRAVA DOS KMS RODADOS PARA TODO CAVALO */}
        <div className="p-4 bg-gradient-to-b from-amber-950/40 via-slate-950/90 to-slate-900 border-b border-amber-500/30 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner mt-0.5">
                <Lock className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                    Mudar a Trava dos KMs Rodados para Todo Cavalo
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Aplicação Imediata
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Escolha um preset ou digite a quilometragem desejada. O sistema atualiza a trava do ciclo e recalcula automaticamente o alerta intermediário (Revisão X) para a metade dos KMs.
                </p>
              </div>
            </div>
          </div>

          {/* Presets e Input Customizado */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/25 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Presets Rápidos:
                </span>
                {[10000, 20000, 30000, 40000, 50000, 60000].map((presetKm) => {
                  const isSelected = selectedTargetKm === presetKm;
                  return (
                    <button
                      key={presetKm}
                      type="button"
                      onClick={() => {
                        setGlobalTaraKm(presetKm);
                        setCustomTaraInput(presetKm.toString());
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm scale-105'
                          : 'bg-slate-950 text-slate-300 hover:text-white border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {presetKm / 1000}k KM
                      {presetKm === 40000 && <span className="text-[9px] opacity-80 ml-0.5">(Scania)</span>}
                    </button>
                  );
                })}
              </div>

              {/* Input Numérico Customizado */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-[11px] font-medium text-slate-400">Outro Valor:</span>
                <input
                  type="number"
                  min="5000"
                  max="200000"
                  step="1000"
                  value={customTaraInput}
                  onChange={(e) => {
                    setCustomTaraInput(e.target.value);
                    const val = Number(e.target.value);
                    if (val > 0) setGlobalTaraKm(val);
                  }}
                  placeholder="Ex: 40000"
                  className="w-24 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                />
                <span className="text-[11px] font-bold text-slate-400">KM</span>
              </div>
            </div>

            {/* Espelho / Breakdown Operacional da Trava Selecionada */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  🔒 Trava Máxima do Ciclo
                </span>
                <span className="font-mono font-black text-amber-300 text-xs mt-0.5 block">
                  {selectedTargetKm.toLocaleString('pt-BR')} KM
                </span>
                <span className="text-[10px] text-slate-400">
                  Dispara vencimento crítico se ultrapassar.
                </span>
              </div>

              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  ⚠️ Alerta para Revisão X
                </span>
                <span className="font-mono font-black text-sky-300 text-xs mt-0.5 block">
                  {selectedAlertKm.toLocaleString('pt-BR')} KM (Metade)
                </span>
                <span className="text-[10px] text-slate-400">
                  Solicita parada preventiva rápida pós-S ou pós-M.
                </span>
              </div>

              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  🚛 Revisão L Completa
                </span>
                <span className="font-mono font-black text-emerald-300 text-xs mt-0.5 block">
                  {selectedTargetKm.toLocaleString('pt-BR')} KM Direto
                </span>
                <span className="text-[10px] text-slate-400">
                  Roda a trava inteira sem parada intermediária.
                </span>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO PRINCIPAIS */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] text-slate-400">
                Total de cavalos na frota: <strong className="text-white">{cavalos.length}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGlobalTaraKm(40000);
                    setCustomTaraInput('40000');
                    if (onUpdateCavaloTaraKm) {
                      onUpdateCavaloTaraKm('ALL', 40000);
                      setFeedbackMessage('Trava de 40.000 KM restaurada para todos os cavalos (Padrão Scania)!');
                      setTimeout(() => setFeedbackMessage(null), 4000);
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                  title="Restaura a trava padrão de 40.000 KM para todos os cavalos"
                >
                  Restaurar 40k Scania
                </button>

                <button
                  type="button"
                  onClick={handleApplyTaraToAll}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:brightness-110 shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer flex items-center gap-2 border border-amber-200"
                  title={`Aplica imediatamente a trava de ${selectedTargetKm.toLocaleString('pt-BR')} KM para todos os ${cavalos.length} cavalos mecânicos`}
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>⚡ MUDAR TRAVA DE TODOS ({cavalos.length} CAVALOS) PARA {selectedTargetKm.toLocaleString('pt-BR')} KM</span>
                </button>
              </div>
            </div>
          </div>

          {/* Banner de Feedback Animado */}
          {feedbackMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>

        {/* Barra de Filtros e Busca de Cavalos */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 space-y-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Filtrar:</span>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  activeFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({cavalos.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('8m')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1 ${
                  activeFilter === '8m'
                    ? 'bg-purple-950 text-purple-200 font-bold border border-purple-700 ring-1 ring-purple-500/40'
                    : 'text-purple-300 hover:text-purple-200'
                }`}
              >
                <span>⏱️ Regra 8 Meses ({countActive})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('km')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1 ${
                  activeFilter === 'km'
                    ? 'bg-amber-950 text-amber-200 font-bold border border-amber-700 ring-1 ring-amber-500/40'
                    : 'text-amber-300 hover:text-amber-200'
                }`}
              >
                <span>🔒 Trava por KM ({countInactive})</span>
              </button>
            </div>

            {onResetToDefault && (
              <button
                type="button"
                onClick={onResetToDefault}
                className="text-[11px] font-semibold text-purple-300 hover:text-purple-200 bg-purple-950/50 hover:bg-purple-900/50 px-2.5 py-1 rounded-lg border border-purple-700/50 transition cursor-pointer flex items-center gap-1.5"
                title="Restaura a lista das 10 placas oficiais homologadas da concessionária com regra de 8 meses"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restaurar 10 Placas 8M Oficiais</span>
              </button>
            )}
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cavalo por placa ou frota (ex: FSJ-8793, TCK-6F83, 9243)..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Cavalos com Checkbox 8M e Ajuste Individual de Trava */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
          {filteredCavalos.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhum cavalo encontrado com os critérios selecionados.
            </div>
          ) : (
            filteredCavalos.map((cavalo) => {
              const isTime = isVehicleTimeBased(cavalo);
              const currentTara = cavalo.cavaloTaraKm || 40000;
              const currentAlertKm = Math.round(currentTara / 2);
              const isEditingThis = editingPlate === cavalo.plate;

              return (
                <div
                  key={cavalo.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isTime
                      ? 'bg-purple-950/30 hover:bg-purple-950/40 border-purple-500/50 shadow-xs'
                      : 'bg-slate-950/60 hover:bg-slate-800/50 border-slate-800 text-slate-300'
                  }`}
                >
                  {/* Lado Esquerdo: Checkbox 8 Meses + Placa + Status + Trava */}
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isTime}
                      onChange={(e) => {
                        onToggleTimeBased(cavalo.plate, e.target.checked);
                      }}
                      className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 cursor-pointer shrink-0"
                      title={isTime ? 'Desmarcar regra de 8 meses' : 'Marcar regra de 8 meses'}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-white">
                          {cavalo.plate}
                        </span>
                        {cavalo.fleetNumber &&
                          cavalo.fleetNumber !== cavalo.plate &&
                          !/^(CAV|TK|CRT)-\d+/i.test(cavalo.fleetNumber) && (
                            <span className="text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                              {cavalo.fleetNumber}
                            </span>
                          )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isTime
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isTime ? '⏱️ 8 MESES' : '🔒 KM PADRÃO'}
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Trava: {currentTara.toLocaleString('pt-BR')} KM
                        </span>

                        <span className="text-[10px] text-slate-400 hidden lg:inline">
                          (Alerta aos {currentAlertKm.toLocaleString('pt-BR')} KM)
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {isTime ? (
                          <span className="text-purple-300/90 font-medium">
                            Vencimento monitorado por data na Scania • Não trava por KM
                            {cavalo.nextRevisionDate ? ` (Vence em ${formatDatePtBr(cavalo.nextRevisionDate)})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Trava de {currentTara.toLocaleString('pt-BR')} KM • Alerta intermediário aos {currentAlertKm.toLocaleString('pt-BR')} KM para Revisão X
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Lado Direito: KM Atual + Controle Individual de Trava deste Cavalo */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                    <span className="font-mono text-xs font-bold text-slate-200 block">
                      {cavalo.currentMeter.toLocaleString('pt-BR')} KM
                    </span>

                    {/* Botões para Mudar a Trava individualmente desta Placa */}
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <span className="text-[10px] text-slate-400 hidden sm:inline mr-0.5">Trava:</span>

                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="5000"
                            step="1000"
                            value={editingKmInput}
                            onChange={(e) => setEditingKmInput(e.target.value)}
                            className="w-16 px-1.5 py-0.5 bg-slate-900 border border-amber-500 rounded text-[10px] font-mono font-bold text-amber-300 focus:outline-none"
                            placeholder="KM"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = Number(editingKmInput);
                              if (val > 0) handleApplyIndividualTara(cavalo.plate, val);
                              setEditingPlate(null);
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 cursor-pointer"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlate(null)}
                            className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          {[20000, 30000, 40000, 50000].map((km) => (
                            <button
                              key={km}
                              type="button"
                              onClick={() => handleApplyIndividualTara(cavalo.plate, km)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                                currentTara === km
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                              }`}
                              title={`Mudar trava desta placa para ${km.toLocaleString('pt-BR')} KM`}
                            >
                              {km / 1000}k
                            </button>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlate(cavalo.plate);
                              setEditingKmInput(currentTara.toString());
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-amber-300 bg-slate-900 border border-slate-700 cursor-pointer"
                            title="Digitar KM customizado para este cavalo"
                          >
                            ✏️
                          </button>
                        </>
                      )}

                      {/* Botão de alternar 8 Meses */}
                      <button
                        type="button"
                        onClick={() => onToggleTimeBased(cavalo.plate, !isTime)}
                        className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border ${
                          isTime
                            ? 'bg-purple-900/40 hover:bg-rose-950/60 text-purple-200 hover:text-rose-300 border-purple-700/50 hover:border-rose-700/50'
                            : 'bg-slate-800 hover:bg-purple-900/40 text-slate-300 hover:text-purple-200 border-slate-700 hover:border-purple-600/50'
                        }`}
                      >
                        {isTime ? 'Desmarcar 8M' : 'Marcar 8M'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Travas e regras de 8 meses são aplicadas imediatamente para a frota.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Concluir</span>
          </button>
        </div>
      </div>
    </div>
  );
};


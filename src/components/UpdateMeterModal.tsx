import React, { useState, useEffect } from 'react';
import { X, Gauge, Clock, ArrowRight, AlertTriangle, CheckCircle2, Check, UserCheck } from 'lucide-react';
import { Vehicle } from '../types';
import { formatMeter, isTimeBasedCavalo, isVehicleTimeBased, formatDatePtBr } from '../utils/maintenanceCalculations';
import { validateAndSanitizeMeter, MeterValidationResult, getTkLastPreventivaMeter } from '../utils/meterValidation';

interface UpdateMeterModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (
    vehicleId: string,
    newMeter: number,
    note?: string,
    performedBy?: string,
    readingDate?: string
  ) => void;
}

export const UpdateMeterModal: React.FC<UpdateMeterModalProps> = ({
  vehicle,
  onClose,
  onSave,
}) => {
  const [meterValue, setMeterValue] = useState<string>('');
  const [performedBy, setPerformedBy] = useState<string>('');
  const [readingDate, setReadingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [confirmLower, setConfirmLower] = useState<boolean>(false);

  useEffect(() => {
    if (vehicle) {
      setMeterValue(String(vehicle.currentMeter));
      setNote('');
      setError('');
      setConfirmLower(false);
      setReadingDate(new Date().toISOString().split('T')[0]);

      // Sugestão de responsável padrão baseado no tipo do veículo
      if (vehicle.type === 'tk') {
        setPerformedBy('Técnico Thermo King CDPR');
      } else if (vehicle.type === 'carreta') {
        setPerformedBy('Mecânico de Carretas CDPR');
      } else {
        setPerformedBy('Operação / Mecânico CDPR');
      }
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const isHours = vehicle.meterUnit === 'HORAS';
  const tkLastPreventivaMeter = vehicle.type === 'tk' ? getTkLastPreventivaMeter(vehicle.plate, vehicle) : 0;

  // Validação rigorosa central de odômetro / horímetro com suporte a autorização de redução manual
  const validationResult: MeterValidationResult = validateAndSanitizeMeter(
    meterValue,
    vehicle,
    { allowZeroForCarreta: true, isBatchSync: false, allowRollback: true }
  );

  const parsedValue = validationResult.sanitizedValue;
  const isValidNumber = validationResult.isValid;
  const isLower = isValidNumber && parsedValue < vehicle.currentMeter;
  const newDiff = isValidNumber ? vehicle.nextRevisionMeter - parsedValue : 0;

  const handleQuickAdd = (amount: number) => {
    const base = isValidNumber ? parsedValue : vehicle.currentMeter;
    const nextVal = Math.max(0, base + amount);
    setMeterValue(String(nextVal));
    setError('');
    setConfirmLower(false);
  };

  const executeSave = (finalVal: number) => {
    // Revalidação de segurança antes do envio (permitindo rollback confirmado)
    const check = validateAndSanitizeMeter(finalVal, vehicle, {
      allowZeroForCarreta: true,
      allowRollback: true,
    });
    if (!check.isValid) {
      setError(check.error || `Informe um valor válido de ${isHours ? 'horas' : 'quilômetros'}.`);
      return;
    }

    const finalResponsible = performedBy.trim() || (isHours ? 'Técnico Thermo King' : 'Mecânico / Operador');
    const autoNote = (finalVal < vehicle.currentMeter && !note)
      ? `Ajuste manual de redução (${vehicle.currentMeter.toLocaleString('pt-BR')} → ${check.sanitizedValue.toLocaleString('pt-BR')} ${vehicle.meterUnit})`
      : note.trim() || undefined;

    onSave(
      vehicle.id,
      check.sanitizedValue,
      autoNote,
      finalResponsible,
      readingDate || undefined
    );
    onClose();
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!validationResult.isValid) {
      setError(validationResult.error || `Por favor, informe uma medição válida de ${isHours ? 'horas' : 'quilômetros'}.`);
      return;
    }

    // Se o valor for menor e ainda não foi confirmado expressamente pelo usuário
    if (isLower && !confirmLower) {
      if (vehicle.type === 'carreta' && parsedValue === 0) {
        // Carreta zerando para novo ciclo de 30k/50k é normal e esperado!
        executeSave(0);
        return;
      }
      setError(
        `Atenção: A nova medição informada (${parsedValue.toLocaleString('pt-BR')} ${vehicle.meterUnit}) é MENOR que a medição atual (${vehicle.currentMeter.toLocaleString('pt-BR')} ${vehicle.meterUnit}). Tem certeza que deseja alterar? Confirme no quadro de alerta abaixo.`
      );
      setConfirmLower(true);
      return;
    }

    executeSave(parsedValue);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                isHours
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              }`}
            >
              {isHours ? <Clock className="w-4 h-4" /> : <Gauge className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Atualizar {isHours ? 'Horímetro (Horas)' : 'Odômetro (KM)'}
              </h2>
              <p className="text-xs text-slate-400">
                Placa: <span className="font-mono font-bold text-amber-400">{vehicle.plate}</span>
                {vehicle.fleetNumber &&
                  vehicle.fleetNumber !== vehicle.plate &&
                  !/^(CAV|TK|CRT)-\d+/i.test(vehicle.fleetNumber) && (
                    <span className="text-slate-300"> ({vehicle.fleetNumber})</span>
                  )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          {/* Leitura Atual */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {isHours ? 'Horas Atuais Registradas:' : 'KM Atual Registrado:'}
              </span>
              <span
                className={`font-mono font-bold text-sm ${
                  isHours ? 'text-cyan-300' : 'text-slate-200'
                }`}
              >
                {formatMeter(vehicle.currentMeter, vehicle.meterUnit)}
              </span>
            </div>
            {isHours && tkLastPreventivaMeter > 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  Última Preventiva TK Realizada:
                </span>
                <span className="font-mono font-bold text-cyan-300">
                  {tkLastPreventivaMeter.toLocaleString('pt-BR')} HORAS
                </span>
              </div>
            )}
          </div>

          {/* Input do Novo Valor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Nova Leitura ({vehicle.meterUnit}):</span>
              <span className="text-[11px] text-slate-400">Insira a nova medição</span>
            </label>
            <div className="relative">
              <input
                id="input-new-meter"
                type="text"
                inputMode="numeric"
                value={meterValue}
                onChange={(e) => {
                  setMeterValue(e.target.value);
                  setError('');
                }}
                className={`w-full pl-3 pr-20 py-2.5 bg-slate-950 border rounded-xl text-lg font-mono font-bold focus:outline-none focus:ring-2 ${
                  isHours
                    ? 'text-cyan-400 border-cyan-800/80 focus:ring-cyan-500 focus:border-cyan-500'
                    : 'text-amber-400 border-slate-700 focus:ring-amber-500 focus:border-amber-500'
                }`}
                placeholder={vehicle.currentMeter.toString()}
                autoFocus
              />
              <span
                className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs ${
                  isHours ? 'text-cyan-400' : 'text-slate-400'
                }`}
              >
                {vehicle.meterUnit}
              </span>
            </div>
            {error && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/60 mt-1">
                {error}
              </p>
            )}
            {validationResult.isDecimalTruncationFixed && !error && (
              <p className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/60 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Formato de milhar reconhecido: interpretado com segurança como <strong>{validationResult.sanitizedValue.toLocaleString('pt-BR')} {vehicle.meterUnit}</strong>.</span>
              </p>
            )}
          </div>

          {/* Botões de incremento rápido */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400">Atalhos de incremento:</span>
            <div className="flex flex-wrap gap-1.5">
              {isHours ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(24)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-800/60 cursor-pointer font-medium active:scale-95 transition"
                  >
                    +24h (1 dia)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(50)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-800/60 cursor-pointer font-medium active:scale-95 transition"
                  >
                    +50h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(100)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-800/60 cursor-pointer font-medium active:scale-95 transition"
                  >
                    +100h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(250)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-800/60 cursor-pointer font-medium active:scale-95 transition"
                  >
                    +250h
                  </button>
                </>
              ) : (
                <>
                  {vehicle.type === 'carreta' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMeterValue('0');
                        setError('');
                        setConfirmLower(true);
                        setNote('Odômetro zerado para 0 KM (Revisão de Freios Realizada / Novo Ciclo)');
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/70 font-bold cursor-pointer active:scale-95 transition flex items-center gap-1 shadow-sm"
                      title="Zerar odômetro da carreta para 0 KM para reiniciar a contagem do ciclo da Trava 60K (Atenção 50K)"
                    >
                      <span>🔄 Zerar Odômetro (0 KM)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(500)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer active:scale-95 transition"
                  >
                    +500 km
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(1000)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer active:scale-95 transition"
                  >
                    +1.000 km
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(2500)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer active:scale-95 transition"
                  >
                    +2.500 km
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quem Realizou a Leitura / Manutenção (Rastreabilidade) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Quem Realizou:</span>
              </label>
              <input
                id="input-performed-by"
                type="text"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Ex: Mecânico Carlos, Técnico TK"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Data da Leitura:</label>
              <input
                type="date"
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Confirmação Inline se o valor for menor que o atual */}
          {isLower && (
            <div className="p-3.5 rounded-xl bg-amber-950/70 border-2 border-amber-500/80 text-xs space-y-3 animate-in fade-in shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-200 text-sm">
                    Tem certeza que deseja alterar?
                  </p>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    A medição digitada (<strong className="text-amber-300 font-mono">{parsedValue.toLocaleString('pt-BR')} {vehicle.meterUnit}</strong>) é <strong>MENOR</strong> que a registrada atualmente (<strong className="text-white font-mono">{vehicle.currentMeter.toLocaleString('pt-BR')} {vehicle.meterUnit}</strong>). Redução de <strong className="text-rose-400 font-mono">-{Math.abs(vehicle.currentMeter - parsedValue).toLocaleString('pt-BR')} {vehicle.meterUnit}</strong>.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-200">
                    <input
                      type="checkbox"
                      checked={confirmLower}
                      onChange={(e) => setConfirmLower(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-amber-100">
                      Sim, confirmo que a medição correta é menor (correção de leitura ou novo medidor)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmLower(true);
                    executeSave(parsedValue);
                  }}
                  className="w-full sm:w-auto flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Sim, Tenho Certeza de Alterar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMeterValue(String(vehicle.currentMeter));
                    setConfirmLower(false);
                    setError('');
                  }}
                  className="w-full sm:w-auto py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer transition font-medium"
                >
                  Restaurar Atual ({vehicle.currentMeter.toLocaleString('pt-BR')})
                </button>
              </div>
            </div>
          )}

          {/* Prévia do Alerta com o novo valor */}
          {isValidNumber && (() => {
            const isTime = isVehicleTimeBased(vehicle);
            return (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isTime
                    ? 'bg-purple-950/40 border-purple-800 text-purple-200'
                    : newDiff <= 0
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                    : newDiff <= (isHours ? 100 : 2500)
                    ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {isTime ? (
                    <Clock className="w-4 h-4 text-purple-400" />
                  ) : newDiff <= 0 ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>
                    {isTime
                      ? `Controle por Data (8 Meses) • ${vehicle.nextRevisionType}`
                      : `Projeção para a próxima revisão: ${vehicle.nextRevisionType}`}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {isTime ? (
                    <>
                      Meta de odômetro: {formatMeter(vehicle.nextRevisionMeter, vehicle.meterUnit)} •{' '}
                      <strong className="text-purple-300">
                        Vencimento por data até {formatDatePtBr(vehicle.nextRevisionDate)} (não vence por KM).
                      </strong>
                    </>
                  ) : (
                    <>
                      Meta Alvo: {formatMeter(vehicle.nextRevisionMeter, vehicle.meterUnit)} •{' '}
                      {newDiff <= 0
                        ? `Ficará VENCIDA por ${Math.abs(newDiff).toLocaleString('pt-BR')} ${vehicle.meterUnit}!`
                        : `Restarão ${newDiff.toLocaleString('pt-BR')} ${vehicle.meterUnit} para a revisão.`}
                    </>
                  )}
                </p>
              </div>
            );
          })()}

          {/* Observação Opcional */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">
              Observação / Origem do dado (Opcional):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Leitura de retorno de rota, portaria CDPR"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Ações */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-meter-submit"
              type="button"
              onClick={handleSubmit}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                isHours
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <span>
                {isHours ? 'Salvar Horas' : 'Salvar Medição'}
                {isValidNumber && ` (${parsedValue.toLocaleString('pt-BR')} ${vehicle.meterUnit})`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

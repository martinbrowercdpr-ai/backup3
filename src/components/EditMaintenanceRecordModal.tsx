import React, { useState } from 'react';
import { X, Calendar, Gauge, Wrench, DollarSign, UserCheck, FileText, CheckCircle2 } from 'lucide-react';
import { MaintenanceRecord, VehicleType, RevisionType } from '../types';
import { formatDatePtBr } from '../utils/maintenanceCalculations';

interface EditMaintenanceRecordModalProps {
  record: MaintenanceRecord | null;
  onClose: () => void;
  onSave: (updatedRecord: MaintenanceRecord) => void;
}

const REVISION_TYPES: RevisionType[] = [
  'REVISAO X',
  'REVISAO S',
  'REVISAO M',
  'REVISAO L',
  'PREVENTIVA DE FREIOS (30.000 KM)',
  'PREVENTIVA DE FREIOS 50K (50.000 KM)',
  'FILTRO DIESEL / 500H',
  'PREVENTIVA 1.000H',
  'PREVENTIVA 1.500H',
  'PREVENTIVA 2.100H',
  'MANUTENCAO CORRETIVA',
  'OUTROS',
];

export const EditMaintenanceRecordModal: React.FC<EditMaintenanceRecordModalProps> = ({
  record,
  onClose,
  onSave,
}) => {
  if (!record) return null;

  const [date, setDate] = useState<string>(record.date || new Date().toISOString().split('T')[0]);
  const [meterReading, setMeterReading] = useState<number>(record.meterReading || 0);
  const [revisionType, setRevisionType] = useState<string>(record.revisionType || 'REVISAO S');
  const [workshop, setWorkshop] = useState<string>(record.workshop || '');
  const [technician, setTechnician] = useState<string>(record.technician || '');
  const [cost, setCost] = useState<number>(record.cost || 0);
  const [nextScheduledMeter, setNextScheduledMeter] = useState<number>(record.nextScheduledMeter || 0);
  const [nextScheduledDate, setNextScheduledDate] = useState<string>(record.nextScheduledDate || '');
  const [notes, setNotes] = useState<string>(record.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updated: MaintenanceRecord = {
      ...record,
      date,
      meterReading: Number(meterReading),
      revisionType,
      workshop: workshop.trim() || 'Oficina Autorizada',
      technician: technician.trim() || undefined,
      cost: Number(cost) || 0,
      nextScheduledMeter: Number(nextScheduledMeter),
      nextScheduledDate: nextScheduledDate || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    setIsSubmitting(false);
    onClose();
  };

  const isHours = record.vehicleType === 'tk';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Editar Registro de Revisão
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Placa: <strong className="font-mono text-slate-200">{record.plate}</strong> • Registro ID: {record.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Data da Revisão */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              Data Real da Revisão
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Formato exibido no sistema: <strong className="text-amber-300">{formatDatePtBr(date)}</strong>
            </span>
          </div>

          {/* Odômetro / Horímetro da Revisão */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-400" />
                {isHours ? 'Horímetro Real' : 'Odômetro Real (KM)'}
              </label>
              <input
                type="number"
                required
                min="0"
                value={meterReading}
                onChange={(e) => setMeterReading(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-purple-400" />
                Tipo de Revisão
              </label>
              <select
                value={revisionType}
                onChange={(e) => setRevisionType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                {REVISION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {!REVISION_TYPES.includes(revisionType as any) && (
                  <option value={revisionType}>{revisionType}</option>
                )}
              </select>
            </div>
          </div>

          {/* Oficina & Técnico */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Oficina / Concessionária</label>
              <input
                type="text"
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                placeholder="Ex: Concessionária Scania"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Técnico / Responsável</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Ex: Equipe Técnica Scania"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Custo R$ e Próxima Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Custo Total (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Próxima Meta ({isHours ? 'Horas' : 'KM'})
              </label>
              <input
                type="number"
                min="0"
                value={nextScheduledMeter}
                onChange={(e) => setNextScheduledMeter(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Vencimento Previsto (Data) se aplicável */}
          {record.isTimeBasedRevision && (
            <div>
              <label className="block text-purple-300 font-semibold mb-1">
                ⏱️ Data de Vencimento Prevista (Regra de 8 Meses)
              </label>
              <input
                type="date"
                value={nextScheduledDate}
                onChange={(e) => setNextScheduledDate(e.target.value)}
                className="w-full bg-slate-950 border border-purple-700/60 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Observações da Revisão</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva detalhes ou peças trocadas..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

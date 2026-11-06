import React, { useState, useEffect } from 'react';
import { X, Plus, Truck, Container, Snowflake, Check, HelpCircle } from 'lucide-react';
import { Vehicle, VehicleType, RevisionType } from '../types';
import {
  CAVALO_REVISIONS,
  CARRETA_REVISIONS,
  TK_REVISIONS,
  addMonthsToDate,
} from '../utils/maintenanceCalculations';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (newVehicle: Vehicle) => void;
  existingCarretas: Vehicle[];
  existingTks: Vehicle[];
}

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onAddVehicle,
  existingCarretas,
  existingTks,
}) => {
  const [type, setType] = useState<VehicleType>('cavalo');
  const [plate, setPlate] = useState<string>('');
  const [fleetNumber, setFleetNumber] = useState<string>('');
  const [brand, setBrand] = useState<string>('Scania');
  const [model, setModel] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [currentMeter, setCurrentMeter] = useState<number>(0);
  const [nextRevisionType, setNextRevisionType] = useState<RevisionType>('REVISAO X');
  const [nextRevisionMeter, setNextRevisionMeter] = useState<number>(20000);
  const [isTimeBasedRevision, setIsTimeBasedRevision] = useState<boolean>(false);
  const [observations, setObservations] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Atualizar presets quando o tipo mudar
  useEffect(() => {
    if (type === 'cavalo') {
      setBrand('Scania');
      setModel('R450 6x2');
      setNextRevisionType('REVISAO X');
      setNextRevisionMeter(currentMeter + 20000);
    } else if (type === 'carreta') {
      setBrand('');
      setModel('');
      setNextRevisionType('PREVENTIVA DE FREIOS (30.000 KM)');
      setNextRevisionMeter(currentMeter + 30000);
    } else if (type === 'tk') {
      setBrand('');
      setModel('');
      setNextRevisionType('PREVENTIVA TK (1.500 HORAS)');
      setNextRevisionMeter(currentMeter + 1500);
    }
  }, [type]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPlate = plate.toUpperCase().trim();
    if (!cleanPlate) {
      setError('Informe a placa ou identificador da unidade.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const meterUnit = type === 'tk' ? 'HORAS' : 'KM';

    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}`,
      plate: cleanPlate,
      fleetNumber: fleetNumber.toUpperCase().trim() || cleanPlate,
      type,
      brand: '',
      model: '',
      year: Number(year) || new Date().getFullYear(),
      currentMeter: Number(currentMeter) || 0,
      meterUnit,
      lastMaintenanceDate: today,
      lastMaintenanceType: 'CADASTRO INICIAL',
      lastMaintenanceMeter: Number(currentMeter) || 0,
      nextRevisionType,
      nextRevisionMeter: Number(nextRevisionMeter),
      isTimeBasedRevision: type === 'cavalo' ? isTimeBasedRevision : undefined,
      timeBasedIntervalMonths: type === 'cavalo' && isTimeBasedRevision ? 8 : undefined,
      nextRevisionDate: type === 'cavalo' && isTimeBasedRevision ? addMonthsToDate(today, 8) : undefined,
      status: 'active',
      observations: observations.trim() || undefined,
      updatedAt: today,
    };

    onAddVehicle(newVehicle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Cadastrar Nova Unidade / Placa
              </h2>
              <p className="text-xs text-slate-400">
                Adicione um cavalo mecânico, carreta ou equipamento TK
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Tipo de Veículo / Equipamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200">
              Categoria do Veículo / Equipamento:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('cavalo')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  type === 'cavalo'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-1 ring-sky-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Truck className="w-5 h-5 text-sky-400" />
                <span>Cavalo</span>
              </button>

              <button
                type="button"
                onClick={() => setType('carreta')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  type === 'carreta'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Container className="w-5 h-5 text-amber-400" />
                <span>Carreta</span>
              </button>

              <button
                type="button"
                onClick={() => setType('tk')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  type === 'tk'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Snowflake className="w-5 h-5 text-cyan-400" />
                <span>TK (Frio)</span>
              </button>
            </div>
          </div>

          {/* Placa e Prefixo de Frota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Placa / Identificador:
              </label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder={type === 'tk' ? 'Ex: TK-8805' : 'Ex: BRA2E19'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-400 uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Número / Apelido (Opcional):
              </label>
              <input
                type="text"
                value={fleetNumber}
                onChange={(e) => setFleetNumber(e.target.value.toUpperCase())}
                placeholder="Opcional (padrão: mesma placa)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Ano e Medição Atual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Ano de Fabricação:
              </label>
              <input
                type="number"
                min="1990"
                max="2030"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {type === 'tk' ? 'Horímetro Atual (Horas):' : 'Odômetro Atual (KM):'}
              </label>
              <input
                type="number"
                min="0"
                value={currentMeter}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentMeter(val);
                  if (type === 'cavalo') setNextRevisionMeter(val + 20000);
                  else if (type === 'carreta') setNextRevisionMeter(val + 30000);
                  else setNextRevisionMeter(val + 1000);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Configuração da Próxima Revisão Programada */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span>Programação de Revisão Preventiva ({type.toUpperCase()}):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Próxima Revisão Prevista:</label>
                <select
                  value={nextRevisionType}
                  onChange={(e) => setNextRevisionType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {type === 'cavalo' && (
                    <>
                      <option value="REVISAO X">REVISAO X</option>
                      <option value="REVISAO S">REVISAO S</option>
                      <option value="REVISAO L">REVISAO L</option>
                      <option value="REVISAO M">REVISAO M</option>
                    </>
                  )}
                  {type === 'carreta' && (
                    <>
                      <option value="PREVENTIVA DE FREIOS (30.000 KM)">PREVENTIVA DE FREIOS (30.000 KM)</option>
                      <option value="PREVENTIVA DE FREIOS (50.000 KM)">PREVENTIVA DE FREIOS (50.000 KM)</option>
                    </>
                  )}
                  {type === 'tk' && (
                    <>
                      <option value="PREVENTIVA TK (1.500 HORAS)">PREVENTIVA TK (1.500 HORAS)</option>
                      <option value="PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO">PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO</option>
                      <option value="MANUTENÇÃO PREVENTIVA">MANUTENÇÃO PREVENTIVA</option>
                      <option value="MANUTENÇÃO CORRETIVA">MANUTENÇÃO CORRETIVA</option>
                      <option value="PREVENTIVA TK (1.000 HORAS)">PREVENTIVA TK (1.000 HORAS)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">
                  Meta Alvo ({type === 'tk' ? 'Horas' : 'KM'}):
                </label>
                <input
                  type="number"
                  min="0"
                  value={nextRevisionMeter}
                  onChange={(e) => setNextRevisionMeter(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Opção Regra 8 Meses para Cavalo */}
          {type === 'cavalo' && (
            <div className="p-3 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTimeBasedRevision}
                  onChange={(e) => setIsTimeBasedRevision(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span className="text-xs font-bold text-purple-200">
                  ⏱️ Ativar Regra de 8 Meses (Vencimento por data na Scania)
                </span>
              </label>
              <p className="text-[11px] text-purple-300/80 pl-6">
                Calcula o vencimento por data (+8 meses) a partir do cadastro, sem travar como vencida por quilometragem (KM).
              </p>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Observações Operacionais:
            </label>
            <input
              type="text"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: Rota prioritária, semirreboque frigorífico do CDPR"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

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
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar e Iniciar Monitoramento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

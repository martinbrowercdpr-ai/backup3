import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wrench,
  Calendar,
  DollarSign,
  Check,
  Calculator,
  Upload,
  FileText,
  FileCheck,
  Trash2,
  Clock,
  Receipt,
  Search,
  Truck,
  Sparkles,
} from 'lucide-react';
import { Vehicle, RevisionType, MaintenanceRecord, InvoiceAttachment } from '../types';
import {
  CAVALO_REVISIONS,
  CARRETA_REVISIONS,
  TK_REVISIONS,
  TK_AUTHORIZED_WORKSHOPS,
  getNextRevisionSuggestion,
  isTimeBasedCavalo,
  isVehicleTimeBased,
  isTkFilter500hPlate,
  isTkFilter1000hPlate,
  isCarreta30k,
  isCarreta50k,
  getCarretaIntervalKm,
  addMonthsToDate,
  formatDatePtBr,
  getDaysDifference,
} from '../utils/maintenanceCalculations';
import { SCANIA_REVISIONS_CATALOG, ScaniaRevisionDetail } from '../data/scaniaRevisionCatalog';
import { validateAndSanitizeMeter } from '../utils/meterValidation';

interface RegisterMaintenanceModalProps {
  vehicle: Vehicle | null;
  vehicles?: Vehicle[];
  isOpen?: boolean;
  onClose: () => void;
  onSaveMaintenance: (record: MaintenanceRecord, updatedVehicle: Partial<Vehicle>) => void;
}

export const RegisterMaintenanceModal: React.FC<RegisterMaintenanceModalProps> = ({
  vehicle,
  vehicles = [],
  isOpen,
  onClose,
  onSaveMaintenance,
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Veículo ativo (predefinido ou selecionado manualmente)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    if (vehicle) return vehicle.id;
    if (vehicles.length > 0) {
      const fsj = vehicles.find((v) => v.plate === 'FSJ-8793');
      return fsj ? fsj.id : vehicles[0].id;
    }
    return '';
  });

  const [searchTerm, setSearchTerm] = useState('');

  const activeVehicle = vehicle || vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;

  // Determinar opções de revisão de acordo com o tipo
  const getRevisionOptions = (v: Vehicle | null) => {
    if (!v) return [];
    if (v.type === 'cavalo') {
      return CAVALO_REVISIONS.map((r) => ({ type: r.type, desc: r.description, interval: r.intervalKm }));
    } else if (v.type === 'carreta') {
      return CARRETA_REVISIONS.map((r) => ({ type: r.type, desc: r.description, interval: r.intervalKm }));
    } else {
      // Regra Thermo King: PREVENTIVA TK (1.500 HORAS), 6 placas com filtro 500H e placa EQF-4590 com filtro 1.000H
      const is6Placas = isTkFilter500hPlate(v.plate) || Boolean(v.isTk500hFilterRule);
      const is1000hPlaca = isTkFilter1000hPlate(v.plate) || Boolean(v.isTk1000hFilterRule);
      return [
        { type: 'PREVENTIVA TK (1.500 HORAS)', desc: 'Preventiva periódica 1.500 horas: óleo diesel TK, compressor, correias e revisão geral (+1.500h)', interval: 1500 },
        { type: 'PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO', desc: is6Placas ? 'Troca de Filtros Preventiva TK (Regra Oficial das 6 Placas • 500H)' : 'Troca de Filtros Preventiva TK (500 Horas)', interval: 500 },
        { type: 'PREVENTIVA TK (1.000 HORAS)', desc: is1000hPlaca ? 'Troca de Filtros Preventiva TK (Regra da Placa EQF-4590 • 1.000H)' : 'Preventiva periódica 1.000 horas: correias, filtros e carga de gás (+1.000h)', interval: 1000 },
        { type: 'MANUTENÇÃO PREVENTIVA', desc: 'Manutenção preventiva periódica do aparelho Thermo King (+1.000h)', interval: 1000 },
        { type: 'MANUTENÇÃO CORRETIVA', desc: 'Manutenção corretiva / conserto ou reparo no equipamento TK', interval: 0 },
      ];
    }
  };

  const options = getRevisionOptions(activeVehicle);
  const defaultSelected = activeVehicle?.nextRevisionType || options[0]?.type || 'REVISAO X';

  const [revisionType, setRevisionType] = useState<RevisionType>(defaultSelected);
  const [date, setDate] = useState<string>(today);
  const [meterInputStr, setMeterInputStr] = useState<string>(
    activeVehicle ? String(activeVehicle.currentMeter) : '0'
  );
  const [meterReading, setMeterReading] = useState<number>(activeVehicle?.currentMeter ?? 0);
  const [workshop, setWorkshop] = useState<string>(() => {
    if (activeVehicle?.type === 'cavalo') return 'Concessionária Scania';
    if (activeVehicle?.type === 'tk') return 'VIDEFRIGO';
    return 'Oficina Central CDPR';
  });
  const [technician, setTechnician] = useState<string>(
    activeVehicle?.type === 'cavalo' ? 'Equipe Técnica Scania CDPR' : activeVehicle?.type === 'tk' ? 'Técnico Especializado VideFrigo' : ''
  );
  const [cost, setCost] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [partsText, setPartsText] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [meterError, setMeterError] = useState<string>('');

  // Controle temporal de 8 Meses
  const [isTimeBased, setIsTimeBased] = useState<boolean>(() => {
    if (!activeVehicle) return false;
    return isVehicleTimeBased(activeVehicle);
  });

  // Anexo de Nota Fiscal / Relatório em PDF ou Imagem
  const [invoiceAttachment, setInvoiceAttachment] = useState<InvoiceAttachment | undefined>(undefined);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sugestão da próxima revisão calculada automaticamente pela regra
  const [nextRevisionType, setNextRevisionType] = useState<RevisionType>('');
  const [intervalAdded, setIntervalAdded] = useState<number>(20000);
  const [nextRevisionMeter, setNextRevisionMeter] = useState<number>(0);
  const [nextScheduledDate, setNextScheduledDate] = useState<string>(
    isTimeBased ? addMonthsToDate(today, 8) : ''
  );

  // Sincronizar quando activeVehicle muda
  useEffect(() => {
    if (!activeVehicle) return;
    const currentOpt = getRevisionOptions(activeVehicle);
    const initType = activeVehicle.nextRevisionType || currentOpt[0]?.type || 'REVISAO X';
    setRevisionType(initType);
    setMeterReading(activeVehicle.currentMeter);
    setMeterInputStr(activeVehicle.currentMeter.toLocaleString('pt-BR'));
    setDate(today);
    setInvoiceAttachment(undefined);
    setPartsText('');
    setCost('');
    setInvoiceNumber('');
    setNotes('');

    const timeRule = isVehicleTimeBased(activeVehicle);
    setIsTimeBased(timeRule);
    if (activeVehicle.type === 'cavalo') {
      setWorkshop('SCANIA');
      setTechnician('Equipe Concessionária Scania');
    } else if (activeVehicle.type === 'tk') {
      setWorkshop('VIDEFRIGO');
      setTechnician('Técnico Especializado VideFrigo');
    } else {
      setWorkshop('MOLA MUNDIAL');
      setTechnician('Equipe Técnica Mola Mundial');
    }
  }, [activeVehicle?.id]);

  // Recalcular sugestão de próxima revisão quando o tipo realizado, KM ou data mudam
  useEffect(() => {
    if (!activeVehicle) return;
    const suggestion = getNextRevisionSuggestion(activeVehicle.type, meterReading, revisionType, activeVehicle.plate, date);
    setNextRevisionType(suggestion.nextType);
    setIntervalAdded(suggestion.intervalAdded);
    setNextRevisionMeter(suggestion.nextTarget);
    if (isTimeBased) {
      setNextScheduledDate(addMonthsToDate(date, 8));
    }
  }, [revisionType, meterReading, activeVehicle?.type, activeVehicle?.plate, date, isTimeBased]);

  if (isOpen === false || !activeVehicle) return null;

  // Cálculo de dias decorridos desde a data informada
  const daysSinceExecution = Math.max(0, getDaysDifference(today, date));
  const daysRemainingToNext = nextScheduledDate ? getDaysDifference(nextScheduledDate) : undefined;

  const handleApplyInterval = (interval: number, targetType?: RevisionType) => {
    setIntervalAdded(interval);
    setNextRevisionMeter(meterReading + interval);
    if (targetType) {
      setNextRevisionType(targetType);
    }
  };

  const handleMeterInputChange = (raw: string) => {
    setMeterInputStr(raw);
    setMeterError('');
    if (!activeVehicle) return;

    const valRes = validateAndSanitizeMeter(raw, activeVehicle, {
      allowZeroForCarreta: true,
      isBatchSync: false,
      isMaintenanceRegistration: true,
      allowRollback: true,
    });

    if (valRes.isValid) {
      setMeterReading(valRes.sanitizedValue);
    } else if (valRes.error) {
      setMeterError(valRes.error);
    }
  };

  // Upload de arquivo Nota Fiscal / PDF com compressão inteligente para caber na nuvem
  const handleFileUpload = (file: File) => {
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
            setInvoiceAttachment({
              name: file.name.replace(/\.[^.]+$/, '.jpg'),
              size: Math.round((compressedDataUrl.length * 3) / 4),
              type: 'image/jpeg',
              dataUrl: compressedDataUrl,
              uploadedAt: new Date().toISOString(),
            });
            return;
          }
          setInvoiceAttachment({
            name: file.name,
            size: file.size,
            type: file.type || 'image/jpeg',
            dataUrl: e.target?.result as string,
            uploadedAt: new Date().toISOString(),
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF ou documento
      if (file.size > 850 * 1024) {
        alert('O arquivo selecionado tem mais de 850KB. Para sincronização rápida na nuvem, recomendamos PDFs de até 800KB.');
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setInvoiceAttachment({
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          dataUrl,
          uploadedAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Preencher atalho rápido do usuário (ex: FSJ-8793, 20/03/2026, 465.989 KM, 8 Meses)
  const handleApplyUserPresetFsj = () => {
    const fsj = vehicles.find((v) => v.plate === 'FSJ-8793');
    if (fsj) {
      setSelectedVehicleId(fsj.id);
    }
    setDate('2026-03-20');
    setMeterReading(465989);
    setMeterInputStr('465.989');
    setRevisionType('REVISAO M');
    setIsTimeBased(true);
    setNextScheduledDate('2026-11-20');
    setNextRevisionMeter(474390);
    setNextRevisionType('REVISAO L');
    setNotes('Manutenção Manual REVISAO M (8 Meses) realizada aos 465.989 KM em 20/03/2026.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de medição para registro de manutenção (permite revisões com horímetro/KM anterior ou atual)
    const valRes = validateAndSanitizeMeter(meterInputStr, activeVehicle, {
      allowZeroForCarreta: true,
      isBatchSync: false,
      isMaintenanceRegistration: true,
      allowRollback: true,
    });

    if (!valRes.isValid) {
      setMeterError(valRes.error || 'Valor de medição inválido.');
      return;
    }

    const validatedMeter = valRes.sanitizedValue;

    const parts = partsText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    const newRecord: MaintenanceRecord = {
      id: `maint-manual-${Date.now()}`,
      vehicleId: activeVehicle.id,
      plate: activeVehicle.plate,
      vehicleType: activeVehicle.type,
      date,
      revisionType,
      meterReading: validatedMeter,
      workshop: workshop || 'Concessionária Scania',
      technician: technician || undefined,
      cost: cost ? parseFloat(cost.replace(',', '.')) : undefined,
      partsReplaced: parts.length > 0 ? parts : undefined,
      notes: notes || undefined,
      nextScheduledMeter: Number(nextRevisionMeter),
      invoiceNumber: invoiceNumber || undefined,
      invoiceAttachment,
      isTimeBasedRevision: isTimeBased,
      nextScheduledDate: isTimeBased ? nextScheduledDate : undefined,
    };

    const isCarreta = activeVehicle.type === 'carreta';
    const carretaTara = isCarreta ? (Number(nextRevisionMeter) > 0 ? Number(nextRevisionMeter) : 60000) : undefined;

    // Carreta: ZERA a quilometragem rodada atual após manutenção de freio (0 KM) para recomeçar o ciclo da trava de 60.000 KM (Atenção com 50.000 KM)!
    const newCurrentMeter = isCarreta ? 0 : Math.max(activeVehicle.currentMeter, validatedMeter);
    const newLastMaintenanceMeter = validatedMeter; // Salva a quilometragem real em que a revisão foi realizada (ex: 66.398 KM)
    const newNextRevisionMeter = isCarreta ? (carretaTara || 60000) : Number(nextRevisionMeter);
    const targetCarretaRevisionType = 'PREVENTIVA DE FREIOS (60.000 KM)';

    const updatedVehicleData: Partial<Vehicle> = {
      currentMeter: newCurrentMeter,
      lastMaintenanceDate: date,
      lastMaintenanceType: revisionType,
      lastMaintenanceMeter: newLastMaintenanceMeter,
      nextRevisionType: isCarreta ? targetCarretaRevisionType : nextRevisionType,
      nextRevisionMeter: newNextRevisionMeter,
      carretaTaraKm: isCarreta ? carretaTara : undefined,
      kmSinceLastMaintenance: 0, // RESETA OS KM PARA RODAR O NOVO CICLO A PARTIR DE 0!
      isTimeBasedRevision: isTimeBased,
      timeBasedIntervalMonths: isTimeBased ? 8 : undefined,
      nextRevisionDate: isTimeBased ? nextScheduledDate : activeVehicle.nextRevisionDate,
      status: 'active',
      observations: isCarreta
        ? `Manutenção de freio realizada aos ${Number(meterReading).toLocaleString('pt-BR')} KM em ${formatDatePtBr(date)}. Odômetro zerado para 0 KM. Novo ciclo iniciado até a trava de ${(carretaTara || 60000).toLocaleString('pt-BR')} KM (Atenção aos 50K).`
        : activeVehicle.observations,
      updatedAt: today,
    };

    onSaveMaintenance(newRecord, updatedVehicleData);
    onClose();
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.plate.toLowerCase().includes(term) ||
      (v.fleetNumber && v.fleetNumber.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Registrar Manutenção Manual</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Manual / Preventiva
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Placa Selecionada:{' '}
                <span className="font-mono font-bold text-amber-400">{activeVehicle.plate}</span>
                {isTimeBased && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40">
                    ⏱️ Regra Temporal 8 Meses
                  </span>
                )}
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

        {/* Seletor de Veículo / Placa (disponível para selecionar ou trocar de veículo) */}
        {vehicles.length > 0 && (
          <div className="p-3 bg-slate-950/90 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                <span>Selecione a Placa para Lançamento Manual:</span>
              </label>

              {/* Botão de Atalho Rápido para a placa informada pelo usuário */}
              <button
                type="button"
                onClick={handleApplyUserPresetFsj}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                title="Preencher com os dados do chamado: FSJ-8793 • 20/03/2026 • 465.989 KM • 8 Meses"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Atalho FSJ-8793 (20/03/2026)</span>
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={activeVehicle.id}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500 font-mono"
              >
                <optgroup label="Cavalos Mecânicos (Scania)">
                  {filteredVehicles
                    .filter((v) => v.type === 'cavalo')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} • {v.currentMeter.toLocaleString('pt-BR')} KM{' '}
                        {isVehicleTimeBased(v) ? '⏱️ [8 MESES]' : '🔒 [40K]'}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Carretas (Trava 30K/50K)">
                  {filteredVehicles
                    .filter((v) => v.type === 'carreta')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} • {v.currentMeter.toLocaleString('pt-BR')} KM{' '}
                        {isCarreta50k(v.plate) ? '🔒 [50K]' : '🔒 [30K]'}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Thermo Kings (Horímetro)">
                  {filteredVehicles
                    .filter((v) => v.type === 'tk')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} • {v.currentMeter.toLocaleString('pt-BR')} Horas
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Seleção do Tipo de Revisão Realizada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Tipo de Revisão Executada ({activeVehicle.type.toUpperCase()}):
              </label>
              <span className="text-[10px] text-amber-400 font-semibold">
                {activeVehicle.type === 'cavalo' && 'Ciclo: X ➔ S ➔ L ➔ M (+20.000 KM)'}
                {activeVehicle.type === 'carreta' && 'Regra: Freios 30.000 KM / 50.000 KM'}
                {activeVehicle.type === 'tk' && 'Regra: Horímetro 1.000h / 1.500h'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {options.map((opt) => {
                const isSelected = revisionType === opt.type;
                return (
                  <div
                    key={opt.type}
                    onClick={() => {
                      setRevisionType(opt.type);
                      if (activeVehicle.type === 'carreta') {
                        const is50k = opt.type.includes('50.000') || opt.type.includes('50K');
                        const interval = is50k ? 50000 : 30000;
                        setNextRevisionType(is50k ? 'PREVENTIVA DE FREIOS (50.000 KM)' : 'PREVENTIVA DE FREIOS (30.000 KM)');
                        setNextRevisionMeter(interval);
                        setIntervalAdded(interval);
                      } else if (activeVehicle.type === 'tk') {
                        if (opt.type.includes('1.500') || opt.type.includes('1500')) {
                          setNextRevisionType('PREVENTIVA TK (1.500 HORAS)');
                          setNextRevisionMeter(meterReading + 1500);
                          setIntervalAdded(1500);
                        } else if (opt.type.includes('500') || opt.type.includes('FILTRO')) {
                          setNextRevisionType('PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO');
                          setNextRevisionMeter(meterReading + 500);
                          setIntervalAdded(500);
                        } else if (opt.type.includes('1.000')) {
                          setNextRevisionType('PREVENTIVA TK (1.000 HORAS)');
                          setNextRevisionMeter(meterReading + 1000);
                          setIntervalAdded(1000);
                        } else {
                          setNextRevisionType('PREVENTIVA TK (1.500 HORAS)');
                          setNextRevisionMeter(meterReading + 1500);
                          setIntervalAdded(1500);
                        }
                      }
                    }}
                    className={`p-2 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white font-bold ring-1 ring-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-400">{opt.type}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[9px] text-slate-400 font-normal mt-1 leading-tight line-clamp-2">
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Banner Informativo Cotrasa para Cavalos Mecânicos */}
            {activeVehicle.type === 'cavalo' && (() => {
              const cleanKey = revisionType.includes('L') ? 'REVISAO L' : revisionType.includes('M') ? 'REVISAO M' : revisionType.includes('X') ? 'REVISAO X' : 'REVISAO S';
              const detail: ScaniaRevisionDetail | undefined = SCANIA_REVISIONS_CATALOG[cleanKey];

              if (!detail) return null;

              return (
                <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-600/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Orçamento Cotrasa Scania: {detail.budgetNumber}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        {detail.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      {(!cost || cost === '0') && (
                        <button
                          type="button"
                          onClick={() => setCost(String(detail.totalCost))}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
                        >
                          Usar Valor Oficial
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    <strong>O que faz:</strong> {detail.fullPurpose}
                  </p>

                  <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400">
                    <strong className="text-amber-300">Regra de Ciclo & Trava 40k:</strong> {detail.cyclePositionExplanation}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Dados da Execução: Data e Medição / Tara */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data da Execução / Revisão:
                </span>
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                >
                  Hoje
                </button>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              {date && (
                <span className="text-[10px] text-amber-300 font-medium block">
                  ⏱️ {daysSinceExecution} dias decorridos desde esta revisão ({formatDatePtBr(date)})
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>
                  {activeVehicle.meterUnit === 'HORAS'
                    ? 'Horímetro Atual (Tara na Revisão):'
                    : 'Quilometragem (KM na Revisão):'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Atual: {activeVehicle.currentMeter.toLocaleString('pt-BR')} {activeVehicle.meterUnit}
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={meterInputStr}
                  onChange={(e) => handleMeterInputChange(e.target.value)}
                  placeholder="Ex: 465.989 ou 465989"
                  className="w-full pl-3 pr-16 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-bold">
                  {activeVehicle.meterUnit}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">
                Valor lido: {meterReading.toLocaleString('pt-BR')} {activeVehicle.meterUnit}
              </span>
              {meterError && (
                <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/60 mt-1 font-medium">
                  {meterError}
                </p>
              )}
            </div>
          </div>

          {/* PAINEL ESPECIAL: REGRA TEMPORAL DE 8 MESES PARA CAVALOS */}
          {activeVehicle.type === 'cavalo' && (
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTimeBased}
                    onChange={(e) => setIsTimeBased(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Regra Temporal de 8 Meses (Tara Temporal)
                  </span>
                </label>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded border border-purple-700/60 font-mono">
                  +8 MESES (240 DIAS)
                </span>
              </div>

              {isTimeBased && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-purple-800/40 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Tempo Decorrido:</span>
                    <span className="font-bold text-amber-300 block text-xs">
                      {daysSinceExecution} dias desde a data informada
                    </span>
                    <span className="text-[10px] text-purple-300 font-mono">
                      Data Base: {formatDatePtBr(date)}
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-purple-800/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 block">Vencimento Programado (+8m):</span>
                      {daysRemainingToNext !== undefined && (
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                            daysRemainingToNext <= 0
                              ? 'bg-rose-500/20 text-rose-300'
                              : daysRemainingToNext <= 30
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {daysRemainingToNext <= 0
                            ? `Vencida há ${Math.abs(daysRemainingToNext)}d`
                            : `Restam ${daysRemainingToNext}d`}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={nextScheduledDate}
                      onChange={(e) => setNextScheduledDate(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-purple-500/50 rounded text-xs text-purple-200 font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAINEL DA CARRETA: SELEÇÃO DAS 2 TARAS (30K / 50K) E RESET 0 KM */}
          {activeVehicle.type === 'carreta' && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/60 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚚</span>
                  <span className="font-bold text-amber-300 text-sm">
                    Preventiva de Freios da Carreta • Escolha a Tara (30K ou 50K)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  SEM TRAVA / LIVRE DE DEPENDÊNCIA
                </span>
              </div>

              {/* Botões de Seleção da Tara: 30K vs 50K */}
              {/* Botões de Seleção da Tara: 60K (Oficial) vs 50K vs 30K */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('PREVENTIVA DE FREIOS (60.000 KM)');
                    setNextRevisionType('PREVENTIVA DE FREIOS (60.000 KM)');
                    setNextRevisionMeter(60000);
                    setIntervalAdded(60000);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    nextRevisionMeter === 60000 || (!revisionType.includes('50.000') && !revisionType.includes('30.000') && nextRevisionMeter !== 50000 && nextRevisionMeter !== 30000)
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg ring-2 ring-amber-400/50 font-black'
                      : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {(nextRevisionMeter === 60000 || (!revisionType.includes('50.000') && !revisionType.includes('30.000') && nextRevisionMeter !== 50000 && nextRevisionMeter !== 30000)) && (
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                    )}
                    <span className="text-sm">TARA 60K (OFICIAL)</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90 text-center">
                    Trava 60K • Alerta aos 50K
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('PREVENTIVA DE FREIOS (50.000 KM)');
                    setNextRevisionType('PREVENTIVA DE FREIOS (50.000 KM)');
                    setNextRevisionMeter(50000);
                    setIntervalAdded(50000);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    nextRevisionMeter === 50000 || (revisionType.includes('50.000') && nextRevisionMeter !== 60000)
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg ring-2 ring-amber-400/50 font-black'
                      : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {(nextRevisionMeter === 50000 || (revisionType.includes('50.000') && nextRevisionMeter !== 60000)) && (
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                    )}
                    <span className="text-sm">TARA 50K</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90 text-center">
                    Ciclo de 50.000 KM
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('PREVENTIVA DE FREIOS (30.000 KM)');
                    setNextRevisionType('PREVENTIVA DE FREIOS (30.000 KM)');
                    setNextRevisionMeter(30000);
                    setIntervalAdded(30000);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    nextRevisionMeter === 30000 || (revisionType.includes('30.000') && nextRevisionMeter !== 60000)
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg ring-2 ring-amber-400/50 font-black'
                      : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {(nextRevisionMeter === 30000 || (revisionType.includes('30.000') && nextRevisionMeter !== 60000)) && (
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                    )}
                    <span className="text-sm">TARA 30K</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90 text-center">
                    Ciclo de 30.000 KM
                  </span>
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-800/40 text-[11px] text-slate-300 space-y-1">
                <p>
                  ✓ <strong>Sem Trava / Sem Bloqueio:</strong> Você pode registrar a revisão mesmo que tenha rodado <strong>{Number(meterReading).toLocaleString('pt-BR')} KM</strong> (ex: 66.398 KM). Não há dependência com a meta anterior.
                </p>
                <p>
                  ✓ <strong>Regra Oficial:</strong> Ao salvar, a quilometragem atual da carreta será <strong className="text-emerald-400">ZERADA (0 KM)</strong> para começar um novo ciclo até a Trava de {(nextRevisionMeter || 60000).toLocaleString('pt-BR')} KM (Atenção aos 50K).
                </p>
                <p className="text-slate-400">
                  ✓ O histórico registrará com precisão que esta revisão foi realizada aos <strong>{Number(meterReading).toLocaleString('pt-BR')} KM</strong>.
                </p>
              </div>
            </div>
          )}

          {/* PAINEL DO THERMO KING: SELEÇÃO RÁPIDA (1.500 HORAS vs 500 HORAS - TROCA DE FILTRO) */}
          {activeVehicle.type === 'tk' && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/60 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">❄️</span>
                  <span className="font-bold text-cyan-300 text-sm">
                    Revisão Thermo King • Escolha o Plano (1.500 Horas ou 500 Horas)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  HORÍMETRO DE MOTOR TK
                </span>
              </div>

              {/* Botões de Seleção: 1.500H vs 500H */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('PREVENTIVA TK (1.500 HORAS)');
                    setNextRevisionType('PREVENTIVA TK (1.500 HORAS)');
                    setNextRevisionMeter(meterReading + 1500);
                    setIntervalAdded(1500);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    revisionType.includes('1.500') || revisionType.includes('1500')
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg ring-2 ring-cyan-400/50 font-black'
                      : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {(revisionType.includes('1.500') || revisionType.includes('1500')) && (
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                    )}
                    <span className="text-sm">REVISÃO 1.500H (1.500 HORAS)</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90 text-center">
                    Preventiva periódica de motor diesel (+1.500h)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO');
                    setNextRevisionType(isTkFilter500hPlate(activeVehicle.plate) ? 'PREVENTIVA TK (500 HORAS) - TROCA DE FILTRO' : 'PREVENTIVA TK (1.500 HORAS)');
                    setNextRevisionMeter(meterReading + 500);
                    setIntervalAdded(500);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    revisionType.includes('500') || revisionType.includes('FILTRO')
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg ring-2 ring-cyan-400/50 font-black'
                      : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {(revisionType.includes('500') || revisionType.includes('FILTRO')) && (
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                    )}
                    <span className="text-sm">TROCA DE FILTRO (500 HORAS)</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90 text-center">
                    Troca preventiva de filtros de óleo, ar e diesel (+500h)
                  </span>
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-800/40 text-[11px] text-slate-300 space-y-1">
                <p>
                  ✓ <strong>Horímetro Real da Revisão:</strong> {Number(meterReading).toLocaleString('pt-BR')} horas.
                </p>
                <p className="text-slate-400">
                  ✓ Próxima meta calculada: <strong>{Number(nextRevisionMeter).toLocaleString('pt-BR')} horas</strong> (+{intervalAdded.toLocaleString('pt-BR')}h).
                </p>
              </div>
            </div>
          )}

          {/* Sugestão da Próxima Meta */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Programação da Próxima Revisão:
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                +{intervalAdded.toLocaleString('pt-BR')} {activeVehicle.meterUnit}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Próxima Revisão a Realizar:
                </label>
                <input
                  type="text"
                  value={nextRevisionType}
                  onChange={(e) => setNextRevisionType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 rounded text-xs font-bold text-amber-300 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Meta Prevista ({activeVehicle.meterUnit}):
                </label>
                <input
                  type="number"
                  min="0"
                  value={nextRevisionMeter}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setNextRevisionMeter(val);
                    if (activeVehicle.type === 'carreta') {
                      setIntervalAdded(val);
                    } else {
                      setIntervalAdded(Math.max(0, val - meterReading));
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 rounded text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Oficina e Técnico */}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Oficina / Concessionária que Executou o Serviço:
                </label>
                {activeVehicle.type === 'tk' && (
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wide">
                    Rede Autorizada TK
                  </span>
                )}
              </div>

              {/* Botões de Seleção de Oficinas Autorizadas TK */}
              {activeVehicle.type === 'tk' && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                      Oficina de Manutenção TK:
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Qual oficina realizou a preventiva na placa:
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['VIDEFRIGO', 'MUNIQUE', 'VAMOS'] as const).map((oficina) => {
                      const isSelected = workshop.toUpperCase().includes(oficina);
                      return (
                        <button
                          key={oficina}
                          type="button"
                          onClick={() => {
                            setWorkshop(oficina);
                            setTechnician(`Equipe Técnica ${oficina}`);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg ring-2 ring-amber-400/50 scale-[1.02]'
                              : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-cyan-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                            <span className="tracking-wide text-[12px]">{oficina}</span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold ${
                              isSelected ? 'text-slate-900/80' : 'text-slate-400'
                            }`}
                          >
                            Autorizada TK
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeVehicle.type === 'cavalo' && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      Oficina de Manutenção Cavalo:
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">
                      Apenas SCANIA
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {['SCANIA'].map((oficina) => {
                      const isSelected = workshop.toUpperCase().includes('SCANIA');
                      return (
                        <button
                          key={oficina}
                          type="button"
                          onClick={() => {
                            setWorkshop('SCANIA');
                            setTechnician('Equipe Concessionária Scania');
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg ring-2 ring-amber-400/50'
                              : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                            <span className="tracking-wide text-[13px] font-black">SCANIA</span>
                            <span className="text-[11px] font-medium opacity-80">(Rede Concessionária Autorizada Scania / Cotrasa)</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/40">
                            Exclusiva Cavalos
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeVehicle.type === 'carreta' && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                      Oficinas Homologadas Carretas (3 Oficinas):
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                      Mola Mundial / Coroa / Vamos
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['MOLA MUNDIAL', 'COROA', 'VAMOS'] as const).map((oficina) => {
                      const isSelected = workshop.toUpperCase().includes(oficina);
                      return (
                        <button
                          key={oficina}
                          type="button"
                          onClick={() => {
                            setWorkshop(oficina);
                            setTechnician(`Equipe Técnica ${oficina}`);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg ring-2 ring-emerald-400/50 scale-[1.02]'
                              : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-emerald-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                            <span className="tracking-wide text-[12px]">{oficina}</span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold ${
                              isSelected ? 'text-slate-900/80' : 'text-slate-400'
                            }`}
                          >
                            Autorizada Carreta
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <input
                type="text"
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                placeholder={
                  activeVehicle.type === 'tk'
                    ? 'VIDEFRIGO, MUNIQUE ou VAMOS'
                    : activeVehicle.type === 'carreta'
                    ? 'MOLA MUNDIAL, COROA ou VAMOS'
                    : 'SCANIA (Apenas Concessionária Scania)'
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Mecânico / Técnico Responsável:
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder={activeVehicle.type === 'tk' ? 'Ex: Equipe Técnica VideFrigo' : 'Ex: Equipe Técnica Scania CDPR'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Custo Total */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Custo Total da Manutenção (R$):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Ex: 4850.00"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Observações Técnicas / Diagnóstico:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Manutenção executada conforme manual do fabricante."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Botões de Ação */}
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
              <span>Salvar Manutenção Manual</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

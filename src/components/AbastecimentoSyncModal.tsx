import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  Database,
  ArrowRight,
  Copy,
  Check,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Code,
  History,
  RefreshCw,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Vehicle, AbastecimentoSyncEntry } from '../types';
import { subscribeToAbastecimentoSyncLogs } from '../services/firebaseSyncService';

interface AbastecimentoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onVehicleUpdated?: (updatedVehicle: Vehicle) => void;
}

export const AbastecimentoSyncModal: React.FC<AbastecimentoSyncModalProps> = ({
  isOpen,
  onClose,
  vehicles,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'logs'>('simulator');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Estados do Simulador
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [inputMeter, setInputMeter] = useState<string>('');
  const [frentista, setFrentista] = useState<string>('Frentista Turno A');
  const [posto, setPosto] = useState<string>('Posto Interno CD PR');
  const [litros, setLitros] = useState<string>('250');
  const [isSending, setIsSending] = useState(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Logs em tempo real
  const [syncLogs, setSyncLogs] = useState<AbastecimentoSyncEntry[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAbastecimentoSyncLogs((logs) => {
      setSyncLogs(logs);
    });
    return () => unsub();
  }, [isOpen]);

  // Pré-seleciona primeiro veículo
  useEffect(() => {
    if (vehicles.length > 0 && !selectedPlate) {
      const defaultVeh = vehicles.find((v) => v.plate === 'DUE-4590') || vehicles[0];
      setSelectedPlate(defaultVeh.plate);
      setInputMeter((defaultVeh.currentMeter + 150).toString());
    }
  }, [vehicles, selectedPlate]);

  if (!isOpen) return null;

  const currentVehicle = vehicles.find((v) => v.plate === selectedPlate);

  // URL do Webhook dinâmico baseado na origem da página
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  const webhookUrl = `${currentOrigin}/api/sync-meter`;

  const TARGET_DB_ID = 'ai-studio-remixremixgestod-18dc0af9-af92-49f9-a5b6-17122868abc3';
  const SOURCE_DB_ID = 'ai-studio-controledeabaste-5ed3930c-7d3f-4f51-88e3-bce581c0c010';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const sampleSnippet = `// Exemplo pronto para colar no botão "Salvar Abastecimento" do App A:
async function salvarRegistroAbastecimento(dadosFicha) {
  // 1. Salva o abastecimento na base própria do App de Abastecimento
  // (Database: ${SOURCE_DB_ID})
  await salvarNoBancoLocal(dadosFicha);

  // 2. Dispara aviso automático invisível para o App de Manutenção
  try {
    const resposta = await fetch('${webhookUrl}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        placa: dadosFicha.placa,         // Ex: "${selectedPlate || 'DUE-4590'}"
        hodometro: dadosFicha.hodometro, // Ex: 245926 ou "245.926"
        frentista: dadosFicha.frentista, // Ex: "Carlos" (opcional)
        posto: dadosFicha.posto,         // Ex: "Interno CD PR" (opcional)
        litros: dadosFicha.litros        // Ex: 250 (opcional)
      })
    });

    const resultado = await resposta.json();
    console.log('✅ Hodômetro atualizado na Manutenção em tempo real:', resultado);
  } catch (erro) {
    console.warn('Falha no envio silencioso para manutenção:', erro);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSimulateSend = async () => {
    if (!selectedPlate || !inputMeter) return;
    setIsSending(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/sync-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: selectedPlate,
          hodometro: inputMeter,
          frentista,
          posto,
          litros: litros ? Number(litros) : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSimResult({
          success: true,
          message: data.message || 'Odômetro atualizado instantaneamente no banco de dados!',
          details: data,
        });
      } else {
        setSimResult({
          success: false,
          message: data.message || data.error || 'Erro ao sincronizar',
          details: data,
        });
      }
    } catch (err: any) {
      setSimResult({
        success: false,
        message: err.message || 'Falha na conexão com o servidor',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header do Modal */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Integração com App de Abastecimento
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sincronização automática de hodômetros entre Abastecimento e Manutenção
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status de Conexão dos Dois Bancos de Dados */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* App A: Origem */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Fuel className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">1. App de Abastecimento (Origem)</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Envia Aviso
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  ID: <span className="text-sky-300">{SOURCE_DB_ID}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Ao salvar abastecimento, envia a placa e o hodômetro pela rede.
                </div>
              </div>
            </div>

            {/* App B: Destino */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">2. App de Manutenção (Destino)</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Atualiza em &lt; 1s
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  ID: <span className="text-emerald-300">{TARGET_DB_ID}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Grava no Firestore e a tela atualiza instantaneamente para todos.
                </div>
              </div>
            </div>
          </div>

          {/* URL do Webhook com botão de cópia rápida */}
          <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  URL do Webhook (Cloud Run)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  POST
                </span>
              </div>
              <div className="text-xs font-mono text-slate-200 truncate select-all mt-0.5">
                {webhookUrl}
              </div>
            </div>
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95 shrink-0 cursor-pointer shadow-sm"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'URL Copiada!' : 'Copiar URL do Webhook'}</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="px-5 border-b border-slate-800 flex items-center gap-2 bg-slate-950/20 shrink-0">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'simulator'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulador de Envio (Frentista)</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'code'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Código para o App A</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'logs'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Recebimentos ({syncLogs.length})</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Teste em Tempo Real:</span> Ao clicar no botão abaixo,
                  o simulador enviará uma requisição real para o endpoint do Cloud Run (como se o
                  frentista tivesse acabado de salvar no App de Abastecimento). O hodômetro mudará na
                  tela em menos de 1 segundo!
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Seletor de Placa */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Veículo / Placa
                  </label>
                  <select
                    value={selectedPlate}
                    onChange={(e) => {
                      const p = e.target.value;
                      setSelectedPlate(p);
                      const veh = vehicles.find((v) => v.plate === p);
                      if (veh) {
                        setInputMeter((veh.currentMeter + 100).toString());
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id || v.plate} value={v.plate}>
                        {v.plate} - {v.type.toUpperCase()} ({v.currentMeter.toLocaleString('pt-BR')}{' '}
                        {v.meterUnit})
                      </option>
                    ))}
                  </select>
                  {currentVehicle && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Hodômetro registrado agora:</span>
                      <span className="font-mono font-bold text-white">
                        {currentVehicle.currentMeter.toLocaleString('pt-BR')} {currentVehicle.meterUnit}
                      </span>
                    </div>
                  )}
                </div>

                {/* Novo Hodômetro */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Novo Hodômetro a Registrar (Frentista)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputMeter}
                      onChange={(e) => setInputMeter(e.target.value)}
                      placeholder="Ex: 245926 ou 245.926"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">
                      {currentVehicle?.meterUnit || 'KM'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Aceita com ou sem ponto (ex: 245926 ou 245.926).
                  </p>
                </div>

                {/* Frentista */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Frentista (Opcional)
                  </label>
                  <input
                    type="text"
                    value={frentista}
                    onChange={(e) => setFrentista(e.target.value)}
                    placeholder="Nome do operador / frentista"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Posto / Litros */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Posto
                    </label>
                    <input
                      type="text"
                      value={posto}
                      onChange={(e) => setPosto(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Litros
                    </label>
                    <input
                      type="number"
                      value={litros}
                      onChange={(e) => setLitros(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Disparo */}
              <div className="pt-2">
                <button
                  onClick={handleSimulateSend}
                  disabled={isSending || !selectedPlate || !inputMeter}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando aviso de abastecimento...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Simular Envio do Frentista (Disparar Webhook)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Feedback do Resultado */}
              {simResult && (
                <div
                  className={`p-4 rounded-xl border animate-fadeIn ${
                    simResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {simResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold text-sm">{simResult.message}</div>
                      {simResult.details && (
                        <div className="text-xs font-mono opacity-90">
                          {simResult.details.previousMeter !== undefined && (
                            <span>
                              De {simResult.details.previousMeter.toLocaleString('pt-BR')} para{' '}
                              <strong className="text-white">
                                {simResult.details.newMeter.toLocaleString('pt-BR')}{' '}
                                {simResult.details.unit}
                              </strong>{' '}
                              (Variação: +{simResult.details.diffKm.toLocaleString('pt-BR')})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Cole este código no App de Abastecimento (App A):
                </span>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Código Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed select-all">
                {sampleSnippet}
              </pre>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-white">Como Funciona o Fluxo:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>
                    O frentista digita a placa e o hodômetro no App de Abastecimento e salva.
                  </li>
                  <li>
                    O App de Abastecimento salva na base dele e dispara o POST para o Webhook.
                  </li>
                  <li>
                    O servidor recebe o aviso, encontra o veículo na frota e atualiza o Firestore no
                    Database de Manutenção (<span className="text-sky-300 font-mono">{TARGET_DB_ID}</span>).
                  </li>
                  <li>
                    O painel de manutenção escuta o Firestore em tempo real e exibe o novo valor em
                    menos de 1 segundo!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Registros recebidos via Webhook do App de Abastecimento</span>
                <span className="font-mono font-bold text-slate-300">
                  Total: {syncLogs.length}
                </span>
              </div>

              {syncLogs.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
                  Nenhum registro de abastecimento recebido ainda. Use o simulador na aba ao lado para disparar o primeiro teste!
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Data/Hora</th>
                        <th className="py-2.5 px-3 font-semibold">Placa</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Hodômetro Anterior</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Novo Hodômetro</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Diferença</th>
                        <th className="py-2.5 px-3 font-semibold">Frentista / Posto</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {syncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/50 transition">
                          <td className="py-2.5 px-3 text-slate-400">
                            {log.dateStr} {log.timeStr}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {log.plate}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {log.previousMeter?.toLocaleString('pt-BR')} {log.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                            {log.newMeter?.toLocaleString('pt-BR')} {log.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            +{log.diffMeter?.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">
                            {log.frentista || 'Frentista'}
                            {log.posto ? ` • ${log.posto}` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {log.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                Sucesso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                Aviso
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Endpoint ativo em <strong>/api/sync-meter</strong> (Porta 3000 / Cloud Run)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Wrench,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  Droplet,
  Settings,
  Sparkles,
} from 'lucide-react';
import { SCANIA_REVISIONS_CATALOG, ScaniaRevisionDetail } from '../data/scaniaRevisionCatalog';

interface ScaniaRevisionCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRevisionType?: 'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO';
}

export const ScaniaRevisionCatalogModal: React.FC<ScaniaRevisionCatalogModalProps> = ({
  isOpen,
  onClose,
  initialRevisionType = 'REVISAO S',
}) => {
  const [activeTab, setActiveTab] = useState<'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO'>(
    initialRevisionType
  );

  if (!isOpen) return null;

  const currentRevision: ScaniaRevisionDetail | undefined =
    activeTab !== 'CICLO' ? SCANIA_REVISIONS_CATALOG[activeTab] : undefined;

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="glass-panel w-full max-w-4xl max-h-[92vh] rounded-2xl border border-slate-700/70 shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-slate-700/60 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-blue-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Catálogo Oficial de Revisões Scania
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  COTRASA · SICONnet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                O que cada revisão faz, preços oficiais discriminados e a regra da Trava de 40.000 KM com alerta da Revisão X aos 20.000 KM.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar catálogo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores de Navegação */}
        <div className="px-5 pt-3 border-b border-slate-800/80 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('REVISAO S')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'REVISAO S'
                ? 'bg-slate-900 text-sky-400 border-t-2 border-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>Revisão S</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">R$ 3.449,87</span>
          </button>

          <button
            onClick={() => setActiveTab('REVISAO M')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'REVISAO M'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Revisão M</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">R$ 4.247,16</span>
          </button>

          <button
            onClick={() => setActiveTab('REVISAO L')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'REVISAO L'
                ? 'bg-slate-900 text-rose-400 border-t-2 border-rose-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>Revisão L (Completa)</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">R$ 9.473,89</span>
          </button>

          <button
            onClick={() => setActiveTab('REVISAO X')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'REVISAO X'
                ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>Revisão X</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">R$ 1.134,97</span>
          </button>

          <button
            onClick={() => setActiveTab('CICLO')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ml-auto cursor-pointer ${
              activeTab === 'CICLO'
                ? 'bg-amber-500/20 text-amber-300 border-t-2 border-amber-400 shadow-sm'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-900/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Regra do Ciclo (40k & 20k)</span>
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-950/40">
          {activeTab === 'CICLO' ? (
            /* ========================================================
               ABA EXPLICATIVA DA REGRA DO CICLO & TRAVAS
               ======================================================== */
            <div className="space-y-5 animate-fadeIn">
              {/* Banner de Destaque da Regra */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900/80 to-blue-950/40 border border-amber-500/30 p-4 sm:p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider">
                    Regra Oficial Martin Brower
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Trava de 40.000 KM com Alerta aos 20.000 KM para Revisão X
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  As revisões dos Cavalos Mecânicos possuem <strong>trava de 40.000 KM</strong> de ciclo principal. Porém, ao atingir <strong>+20.000 KM rodados</strong> desde a última revisão, o sistema dispara imediatamente o <strong>alerta para realizar a REVISÃO X</strong> (troca de filtros e engraxamento).
                </p>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Exemplo Prático:</span>
                  </div>
                  <p className="text-slate-300 pl-6">
                    Fez a <strong>Revisão S</strong> ➔ Roda <strong>+20.000 KM</strong> para fazer a <strong>Revisão X</strong> ➔ Feita a X, roda mais <strong>+20.000 KM</strong> (completando a trava de 40.000 KM desde a S) para fazer a <strong>Revisão M</strong>!
                  </p>
                  <p className="text-slate-300 pl-6">
                    Fez a <strong>Revisão M</strong> ➔ Roda <strong>+20.000 KM</strong> para fazer a <strong>Revisão X</strong> ➔ Feita a X, roda mais <strong>+20.000 KM</strong> (completando a trava de 40.000 KM) para fazer a <strong>Revisão L</strong>!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-rose-300 font-black">
                    <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>A ÚNICA EXCEÇÃO: A REVISÃO L</span>
                  </div>
                  <p className="text-slate-300">
                    <strong>A única que NÃO faz esse ciclo intermediário com a Revisão X é a REVISÃO L</strong>, porque ela já é <strong>COMPLETA</strong> (substitui óleo do câmbio, óleo do diferencial, óleo do motor, 8 filtros e graxas). Após a Revisão L, o caminhão roda a trava de <strong>40.000 KM DIRETO</strong> até a Revisão S!
                  </p>
                </div>
              </div>

              {/* Fluxograma Visual do Ciclo */}
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 sm:p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Fluxograma Visual do Ciclo Contínuo de Cavalos</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Etapa 1: Revisão S */}
                  <div className="rounded-xl bg-sky-950/40 border border-sky-600/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-400 uppercase">Etapa 1</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">R$ 3.449,87</span>
                    </div>
                    <div className="text-sm font-black text-white">REVISÃO S</div>
                    <p className="text-[11px] text-slate-300">
                      Troca de 41L de óleo de motor + Kit de filtros + Graxa Scania.
                    </p>
                    <div className="pt-2 border-t border-sky-800/40 flex items-center gap-1 text-[11px] text-amber-300 font-bold">
                      <span>Roda +20.000 KM</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Etapa 2: Revisão X pós-S */}
                  <div className="rounded-xl bg-indigo-950/40 border border-indigo-600/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">Alerta 20k</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">R$ 1.134,97</span>
                    </div>
                    <div className="text-sm font-black text-white">REVISÃO X</div>
                    <p className="text-[11px] text-slate-300">
                      Kit de filtros rápidos + Graxa de chassis.
                    </p>
                    <div className="pt-2 border-t border-indigo-800/40 flex items-center gap-1 text-[11px] text-amber-300 font-bold">
                      <span>Roda +20.000 KM</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Etapa 3: Revisão M */}
                  <div className="rounded-xl bg-amber-950/40 border border-amber-600/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Trava 40k Fechada</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">R$ 4.247,16</span>
                    </div>
                    <div className="text-sm font-black text-white">REVISÃO M</div>
                    <p className="text-[11px] text-slate-300">
                      Óleo 41L + Elemento suplementar + Kit manutenção.
                    </p>
                    <div className="pt-2 border-t border-amber-800/40 flex items-center gap-1 text-[11px] text-amber-300 font-bold">
                      <span>Roda +20.000 KM</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Etapa 4: Revisão X pós-M */}
                  <div className="rounded-xl bg-indigo-950/40 border border-indigo-600/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">Alerta 20k</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">R$ 1.134,97</span>
                    </div>
                    <div className="text-sm font-black text-white">REVISÃO X</div>
                    <p className="text-[11px] text-slate-300">
                      Kit de filtros intermediário + Engraxamento.
                    </p>
                    <div className="pt-2 border-t border-indigo-800/40 flex items-center gap-1 text-[11px] text-amber-300 font-bold">
                      <span>Roda +20.000 KM</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Etapa 5: Revisão L Completa */}
                  <div className="rounded-xl bg-rose-950/40 border border-rose-600/50 p-3.5 space-y-2 ring-1 ring-rose-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-300 uppercase">COMPLETA!</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">R$ 9.473,89</span>
                    </div>
                    <div className="text-sm font-black text-white">REVISÃO L</div>
                    <p className="text-[11px] text-slate-300">
                      Câmbio (17L), Diferencial (13L), Motor (41L) e 8 filtros.
                    </p>
                    <div className="pt-2 border-t border-rose-800/40 flex items-center gap-1 text-[11px] text-emerald-300 font-bold">
                      <span>Roda 40.000 KM Direto!</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Reinício do ciclo: após rodar 40.000 KM direto da Revisão L, o caminhão realiza novamente a <strong>Revisão S</strong>.</span>
                  <span className="font-mono text-sky-400 font-bold">Ciclo Contínuo Scania</span>
                </div>
              </div>
            </div>
          ) : currentRevision ? (
            /* ========================================================
               ABA DETALHADA DE UMA REVISÃO ESPECÍFICA (S, M, L, X)
               ======================================================== */
            <div className="space-y-5 animate-fadeIn">
              {/* Card de Resumo de Valores */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="glass-card p-4 rounded-xl border border-slate-700/80 bg-slate-900/80">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    VALOR TOTAL (COTRASA)
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-400 block">
                    {formatCurrency(currentRevision.totalCost)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Orçamento Oficial: {currentRevision.budgetNumber}
                  </span>
                </div>

                <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                    <Package className="w-3.5 h-3.5 text-sky-400" />
                    <span>MERCADORIAS (PEÇAS)</span>
                  </div>
                  <span className="text-lg font-bold font-mono text-slate-200 block">
                    {formatCurrency(currentRevision.partsCost)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Filtros e kits Scania
                  </span>
                </div>

                <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                    <Droplet className="w-3.5 h-3.5 text-amber-400" />
                    <span>LUBRIFICANTES / ÓLEOS</span>
                  </div>
                  <span className="text-lg font-bold font-mono text-slate-200 block">
                    {formatCurrency(currentRevision.lubricantsCost)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Óleos de motor/câmbio/graxa
                  </span>
                </div>

                <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                    <Settings className="w-3.5 h-3.5 text-rose-400" />
                    <span>SERVIÇOS (MÃO DE OBRA)</span>
                  </div>
                  <span className="text-lg font-bold font-mono text-slate-200 block">
                    {formatCurrency(currentRevision.laborCost)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Concessionária Scania
                  </span>
                </div>
              </div>

              {/* O Que Esta Revisão Faz */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>O QUE ESTA REVISÃO FAZ:</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-400">
                    {currentRevision.intervalRule}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentRevision.fullPurpose}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {currentRevision.whatItDoesSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-md bg-blue-950 text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 mt-2">
                  <strong className="text-amber-300">Posição no Ciclo de 40.000 KM:</strong>{' '}
                  {currentRevision.cyclePositionExplanation}
                </div>
              </div>

              {/* Tabela Oficial de Peças, Insumos e Serviços (Cotrasa) */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden space-y-0">
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Espelho de Negociação COTRASA · Itens Faturados</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentRevision.items.length} itens incluídos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                        <th className="py-2.5 px-3 font-semibold">Código</th>
                        <th className="py-2.5 px-3 font-semibold">Descrição do Produto / Serviço</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Qtde</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Preço Unit.</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Preço Total</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Categoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                      {currentRevision.items.map((item, index) => {
                        let catBadge = 'bg-sky-950/60 text-sky-300 border-sky-800/60';
                        let catLabel = 'Mercadoria';
                        if (item.category === 'lubrificantes') {
                          catBadge = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
                          catLabel = 'Lubrificante';
                        } else if (item.category === 'servicos') {
                          catBadge = 'bg-purple-950/60 text-purple-300 border-purple-800/60';
                          catLabel = 'Mão de Obra';
                        }

                        return (
                          <tr key={index} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 text-slate-400 font-semibold">{item.code}</td>
                            <td className="py-2 px-3 font-sans font-medium text-slate-100">
                              {item.description}
                              {item.ncm && (
                                <span className="text-[10px] text-slate-500 font-mono ml-2">
                                  NCM {item.ncm}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-300">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-slate-400">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-400">
                              {formatCurrency(item.totalPrice)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-semibold border ${catBadge}`}
                              >
                                {catLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950/90 font-mono font-black border-t-2 border-slate-700 text-slate-100">
                        <td colSpan={4} className="py-3 px-3 text-right uppercase font-sans text-xs text-slate-300">
                          Total Orçamento {currentRevision.budgetNumber}:
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 text-sm">
                          {formatCurrency(currentRevision.totalCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Dados Oficiais Cotrasa Veículos e Serviços Ltda (SICONnet Scania)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('CICLO')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-600/40 font-bold transition cursor-pointer"
            >
              Ver Ciclo de 40.000 KM
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

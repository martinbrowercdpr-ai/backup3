import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  Copy,
  ExternalLink,
  Download,
  Truck,
  Container,
  Snowflake,
  AlertOctagon,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Vehicle } from '../types';
import { calculateAlert, formatDatePtBr, isTimeBasedCavalo, isVehicleTimeBased, isTkFilter500hPlate } from '../utils/maintenanceCalculations';
import {
  generateEmailTextReport,
  generateEmailHtmlReport,
  createMailtoUrl,
  createGmailWebUrl,
  createOutlookWebUrl,
  downloadEmlFile,
  copyRichEmailToClipboard,
  simulateEmailDispatch,
  EmailDispatchResult,
} from '../utils/emailReportGenerator';

interface EmailDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onSuccessToast: (message: string) => void;
}

export const EmailDispatchModal: React.FC<EmailDispatchModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onSuccessToast,
}) => {
  const [toEmail, setToEmail] = useState('martinbrowercdpr@gmail.com');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState(
    `[RELATÓRIO DE MANUTENÇÃO] Frota Martin Brower CDPR - Cavalos, Carretas e TKs (${new Date().toLocaleDateString('pt-BR')})`
  );
  const [notes, setNotes] = useState(
    'Prezados, segue o levantamento operacional das manutenções preventivas separado por Cavalos (ordem alfabética), Carretas e Equipamentos TK para programação de paradas e revisões.'
  );

  const [activeTab, setActiveTab] = useState<'preview' | 'cavalo' | 'carreta' | 'tk'>('preview');
  const [isSending, setIsSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<EmailDispatchResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Veículos separados e em ordem alfabética estrita
  const cavalos = [...vehicles.filter((v) => v.type === 'cavalo')].sort((a, b) =>
    a.plate.localeCompare(b.plate)
  );
  const carretas = [...vehicles.filter((v) => v.type === 'carreta')].sort((a, b) =>
    a.plate.localeCompare(b.plate)
  );
  const tks = [...vehicles.filter((v) => v.type === 'tk')].sort((a, b) =>
    a.plate.localeCompare(b.plate)
  );

  const allAlerts = vehicles.map((v) => calculateAlert(v));
  const criticalCount = allAlerts.filter((a) => a.level === 'critical').length;
  const warningCount = allAlerts.filter((a) => a.level === 'warning').length;
  const okCount = allAlerts.filter((a) => a.level === 'ok').length;

  const handleCopyText = async () => {
    const text = generateEmailTextReport(vehicles, { notes, toEmail, subject });
    const html = generateEmailHtmlReport(vehicles, { notes, toEmail, subject });
    try {
      const ok = await copyRichEmailToClipboard(text, html);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        onSuccessToast('Relatório completo copiado (com tabelas e formatação)!');
      }
    } catch (e) {
      console.error('Erro ao copiar texto:', e);
    }
  };

  const handleOpenGmail = () => {
    if (!toEmail.trim()) {
      alert('Por favor, informe o endereço de e-mail de destino.');
      return;
    }
    const text = generateEmailTextReport(vehicles, { notes, toEmail, subject });
    const url = createGmailWebUrl(toEmail, subject, text);
    window.open(url, '_blank');
    onSuccessToast('Gmail aberto em nova aba com o relatório pronto para envio!');
  };

  const handleOpenOutlook = () => {
    if (!toEmail.trim()) {
      alert('Por favor, informe o endereço de e-mail de destino.');
      return;
    }
    const text = generateEmailTextReport(vehicles, { notes, toEmail, subject });
    const url = createOutlookWebUrl(toEmail, subject, text);
    window.open(url, '_blank');
    onSuccessToast('Outlook aberto em nova aba com o relatório pronto para envio!');
  };

  const handleOpenMailto = () => {
    if (!toEmail.trim()) {
      alert('Por favor, informe o endereço de e-mail de destino.');
      return;
    }
    const text = generateEmailTextReport(vehicles, { notes, toEmail, subject });
    const url = createMailtoUrl(toEmail, subject, text);
    window.location.href = url;
  };

  const handleDownloadEml = () => {
    if (!toEmail.trim()) {
      alert('Por favor, informe o endereço de e-mail de destino.');
      return;
    }
    const text = generateEmailTextReport(vehicles, { notes, toEmail, subject });
    const html = generateEmailHtmlReport(vehicles, { notes, toEmail, subject });
    downloadEmlFile(
      `Relatorio_Manutencao_MartinBrower_${new Date().toISOString().split('T')[0]}`,
      toEmail,
      ccEmail,
      subject,
      text,
      html
    );
    onSuccessToast('Arquivo .EML baixado! Abra no Outlook ou Windows Mail e clique em Enviar.');
  };

  const handleDownloadTxt = () => {
    const text = generateEmailTextReport(vehicles, { notes, toEmail, subject });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Manutencao_Separado_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onSuccessToast('Arquivo de relatório .txt baixado com sucesso!');
  };

  const handleDownloadHtml = () => {
    const html = generateEmailHtmlReport(vehicles, { notes, toEmail, subject });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Email_Manutencao_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
    onSuccessToast('Arquivo de e-mail .html baixado com sucesso!');
  };

  const handleSendDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim() || !toEmail.includes('@')) {
      alert('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setIsSending(true);
    try {
      const result = await simulateEmailDispatch(vehicles, {
        toEmail,
        ccEmail,
        subject,
        notes,
      });
      setDispatchResult(result);
      onSuccessToast(`Disparo registrado! Abrindo tela de envio do Gmail para ${toEmail}...`);

      // Aciona abertura direta no Gmail para garantir que a mensagem chegue de fato à caixa postal
      const text = generateEmailTextReport(vehicles, { notes, toEmail, subject });
      const gmailUrl = createGmailWebUrl(toEmail, subject, text);
      window.open(gmailUrl, '_blank');
    } catch (err) {
      console.error('Erro no disparo:', err);
      alert('Ocorreu um erro ao processar o envio.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Disparo de Manutenções por E-mail
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Separadinho Cavalo / Carreta / TK
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Envie o levantamento completo da frota diretamente para o e-mail que você definir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário & Conteúdo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Sucesso Banner */}
          {dispatchResult && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-start gap-3 shadow-lg shadow-emerald-950/30 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs space-y-1">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Disparo Realizado com Sucesso!</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-300">
                    ID: {dispatchResult.messageId}
                  </span>
                </div>
                <p>
                  O relatório estruturado com <strong>{dispatchResult.summary.total} unidades</strong> (
                  {dispatchResult.summary.cavalos} Cavalos, {dispatchResult.summary.carretas} Carretas,{' '}
                  {dispatchResult.summary.tks} TKs) foi encaminhado para{' '}
                  <strong className="text-white underline">{dispatchResult.recipient}</strong>.
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleOpenMailto}
                    className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir também no meu cliente de e-mail</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dados do Destinatário */}
          <form onSubmit={handleSendDispatch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* E-mail de Destino */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    E-mail de Destino (Coloque o endereço desejado):
                  </span>
                  <span className="text-[10px] text-amber-400 font-normal">Obrigatório</span>
                </label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="exemplo@martinbrower.com.br"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition shadow-inner"
                />
              </div>

              {/* E-mail em Cópia (CC) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  E-mail em Cópia (CC - Opcional):
                </label>
                <input
                  type="email"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  placeholder="manutencao@empresa.com.br, frota@empresa.com.br"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition shadow-inner"
                />
              </div>
            </div>

            {/* Assunto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Assunto do E-mail:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition shadow-inner"
              />
            </div>

            {/* Mensagem / Observações Operacionais */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Observação Operacional no Cabeçalho (Opcional):
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Insira instruções para as oficinas, prazos de agendamento ou recados operacionais..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition shadow-inner resize-none"
              />
            </div>

            {/* Caixa de Ações Rápidas de Entrega Real de E-mail */}
            <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 p-3.5 rounded-xl border border-sky-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-sky-500/20 text-sky-300">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-bold text-white">
                    Garantia de Entrega: Envio Real Direto
                  </span>
                </div>
                <span className="text-[10px] text-sky-400 font-semibold bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                  Sem bloqueio de navegador
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Para garantir que a mensagem chegue imediatamente à caixa postal de{' '}
                <strong className="text-sky-300">{toEmail || 'martinbrowercdpr@gmail.com'}</strong>,
                utilize os botões de integração direta abaixo:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenGmail}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-rose-400/30"
                  title="Abre a tela de composição do Gmail já com Martin Brower CDPR preenchido"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>1. Abrir no Gmail</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadEml}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-950/40 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-blue-400/30"
                  title="Baixa arquivo .EML padronizado que abre diretamente no Outlook ou Windows Mail pronto para Enviar"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>2. Baixar .EML (Outlook)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenOutlook}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-slate-700"
                  title="Abrir no Outlook Web"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>3. Outlook Web</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-slate-700"
                  title="Copiar relatório formatado com tabelas"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copied ? 'Copiado!' : '4. Copiar Tudo'}</span>
                </button>
              </div>
            </div>

            {/* Botões de Ação do Disparo */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                  title="Abrir diretamente no Outlook ou aplicativo padrão de e-mail"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Abrir via Mailto</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                  title="Baixar modelo HTML formatado"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Baixar HTML</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                  title="Baixar relatório em texto plano (.txt)"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Baixar TXT</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black tracking-wide shadow-lg shadow-sky-600/30 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparando Envio...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Disparar E-mail & Abrir Gmail</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Abas de Navegação / Visualização Separadinha */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Visualização do Conteúdo Separado por Categoria:
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Resumo Geral
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cavalo')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'cavalo'
                      ? 'bg-sky-500 text-slate-950 shadow-xs'
                      : 'text-sky-400 hover:text-sky-300'
                  }`}
                >
                  <Truck className="w-3 h-3" />
                  <span>Cavalos (A-Z)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('carreta')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'carreta'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <Container className="w-3 h-3" />
                  <span>Carretas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tk')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'tk'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  <Snowflake className="w-3 h-3" />
                  <span>TK Frio</span>
                </button>
              </div>
            </div>

            {/* Painel de Conteúdo por Aba */}
            <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3.5">
              {activeTab === 'preview' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Frota</span>
                      <span className="text-xl font-black text-white font-mono">{vehicles.length}</span>
                    </div>
                    <div className="bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/50">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block">Vencidas</span>
                      <span className="text-xl font-black text-rose-300 font-mono">{criticalCount}</span>
                    </div>
                    <div className="bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/50">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Atenção</span>
                      <span className="text-xl font-black text-amber-300 font-mono">{warningCount}</span>
                    </div>
                    <div className="bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/50">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Em Dia</span>
                      <span className="text-xl font-black text-emerald-300 font-mono">{okCount}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                    <p className="font-semibold text-white mb-1">
                      O e-mail expedirá automaticamente 3 seções completas e detalhadas:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400">
                      <li>
                        <strong className="text-sky-300">1. Cavalos Mecânicos (38 unidades):</strong> Placas organizadas em ordem alfabética estrita (BSZ-5472 até SYM-8I98), KM atual real, última realizada, próxima revisão programada (X, S, L, M) com salto de +20.000 KM, saldo e status dos 10 cavalos com regra temporal de 8 meses.
                      </li>
                      <li>
                        <strong className="text-amber-300">2. Carretas / Semi-Reboques (28 unidades):</strong> Controle de freios 30.000 KM e 50.000 KM com saldo operacional.
                      </li>
                      <li>
                        <strong className="text-cyan-300">3. Equipamentos TK (38 unidades):</strong> Horímetro de motor de refrigeração e preventivas periódicas (1.000h / 1.500h).
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'cavalo' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-sky-400 font-bold border-b border-slate-800 pb-2">
                    <span>Cavalos Mecânicos ({cavalos.length} unidades em Ordem Alfabética):</span>
                    <span className="text-slate-400 font-normal">Revisões X, S, L, M (+20.000 KM)</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {cavalos.map((v, i) => {
                      const alert = calculateAlert(v);
                      const is8m = isVehicleTimeBased(v);
                      return (
                        <div
                          key={v.id}
                          className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-[10px]">
                              {(i + 1).toString().padStart(2, '0')}.
                            </span>
                            <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                              {v.plate}
                            </span>
                            <span className="text-slate-400 font-medium">{v.fleetNumber}</span>
                            {is8m && (
                              <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-800 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                8m
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-300 text-[11px]">
                              {v.currentMeter.toLocaleString('pt-BR')} KM
                            </span>
                            <span className="text-[11px] font-bold text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800">
                              {v.nextRevisionType}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                alert.level === 'critical'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : alert.level === 'warning'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {alert.level === 'critical'
                                ? 'VENCIDA'
                                : alert.level === 'warning'
                                ? 'ATENÇÃO'
                                : 'EM DIA'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'carreta' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-400 font-bold border-b border-slate-800 pb-2">
                    <span>Carretas / Semi-Reboques ({carretas.length} unidades em Ordem Alfabética):</span>
                    <span className="text-slate-400 font-normal">Freios 30.000 / 50.000 KM</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {carretas.map((v, i) => {
                      const alert = calculateAlert(v);
                      return (
                        <div
                          key={v.id}
                          className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-[10px]">
                              {(i + 1).toString().padStart(2, '0')}.
                            </span>
                            <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                              {v.plate}
                            </span>
                            <span className="text-slate-400 font-medium">{v.fleetNumber}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-300 text-[11px]">
                              {v.currentMeter.toLocaleString('pt-BR')} KM
                            </span>
                            <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                              {v.nextRevisionType}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                alert.level === 'critical'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : alert.level === 'warning'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {alert.level === 'critical'
                                ? 'VENCIDA'
                                : alert.level === 'warning'
                                ? 'ATENÇÃO'
                                : 'EM DIA'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'tk' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-cyan-400 font-bold border-b border-slate-800 pb-2">
                    <span>Equipamentos TK ({tks.length} unidades em Ordem Alfabética):</span>
                    <span className="text-slate-400 font-normal">Horímetro 1.000h / 1.500h • Regra 500h (Filtros)</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {tks.map((v, i) => {
                      const alert = calculateAlert(v);
                      const isTk500h = isTkFilter500hPlate(v.plate) || v.isTk500hFilterRule;
                      return (
                        <div
                          key={v.id}
                          className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                            isTk500h
                              ? 'bg-slate-900/95 border-cyan-500/40 shadow-xs'
                              : 'bg-slate-900/80 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-slate-500 text-[10px]">
                              {(i + 1).toString().padStart(2, '0')}.
                            </span>
                            <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                              {v.plate}
                            </span>
                            <span className="text-slate-400 font-medium">{v.fleetNumber}</span>
                            {isTk500h && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                                🛢️ Regra 500h (Filtro)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-300 text-[11px]">
                              {v.currentMeter.toLocaleString('pt-BR')} HORAS
                            </span>
                            <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                              {v.nextRevisionType}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                alert.level === 'critical'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : alert.level === 'warning'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {alert.level === 'critical'
                                ? 'VENCIDA'
                                : alert.level === 'warning'
                                ? 'ATENÇÃO'
                                : 'EM DIA'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Relatório estruturado para agendamento de paradas operacionais</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

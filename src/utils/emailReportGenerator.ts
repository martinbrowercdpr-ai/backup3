import { Vehicle } from '../types';
import { calculateAlert, formatDatePtBr, isTimeBasedCavalo, isVehicleTimeBased, isTkFilter500hPlate } from './maintenanceCalculations';

export interface EmailDispatchOptions {
  toEmail: string;
  ccEmail?: string;
  subject: string;
  notes?: string;
  includeOnlyAlerts?: boolean;
}

export interface EmailDispatchResult {
  success: boolean;
  timestamp: string;
  recipient: string;
  messageId: string;
  summary: {
    total: number;
    cavalos: number;
    carretas: number;
    tks: number;
    critical: number;
    warning: number;
    ok: number;
  };
}

/**
 * Ordena veículos estritamente em ordem alfabética pela placa
 */
function sortByPlateAlphabetical(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate));
}

/**
 * Gera o texto estruturado e formatado por seções (Cavalo, Carreta, TK)
 * ideal para corpo de e-mail, cópia para WhatsApp, Teams ou cliente local.
 */
export function generateEmailTextReport(
  vehicles: Vehicle[],
  options?: Partial<EmailDispatchOptions>
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const cavalos = sortByPlateAlphabetical(vehicles.filter((v) => v.type === 'cavalo'));
  const carretas = sortByPlateAlphabetical(vehicles.filter((v) => v.type === 'carreta'));
  const tks = sortByPlateAlphabetical(vehicles.filter((v) => v.type === 'tk'));

  const allAlerts = vehicles.map((v) => calculateAlert(v));
  const criticalCount = allAlerts.filter((a) => a.level === 'critical').length;
  const warningCount = allAlerts.filter((a) => a.level === 'warning').length;
  const okCount = allAlerts.filter((a) => a.level === 'ok').length;

  let text = '';

  text += `=================================================================\n`;
  text += `   RELATÓRIO OPERACIONAL DE MANUTENÇÃO PREVENTIVA DE FROTA\n`;
  text += `   GERADO EM: ${dateStr} às ${timeStr}\n`;
  text += `=================================================================\n\n`;

  text += `📊 RESUMO GERAL DA FROTA:\n`;
  text += `• Total de Unidades Monitoradas: ${vehicles.length}\n`;
  text += `• 🚨 VENCIDAS (Crítico): ${criticalCount}\n`;
  text += `• ⚠️ PRÓXIMAS DE VENCER (Atenção): ${warningCount}\n`;
  text += `• ✅ EM DIA (Regular): ${okCount}\n`;
  text += `• Distribuição: ${cavalos.length} Cavalos | ${carretas.length} Carretas | ${tks.length} TKs\n\n`;

  if (options?.notes) {
    text += `📝 OBSERVAÇÃO DO RESPONSÁVEL:\n`;
    text += `${options.notes}\n\n`;
  }

  // -------------------------------------------------------------
  // 1. SEÇÃO CAVALOS MECÂNICOS (ORDEM ALFABÉTICA)
  // -------------------------------------------------------------
  text += `-----------------------------------------------------------------\n`;
  text += `🚚 1. CAVALOS MECÂNICOS (${cavalos.length} UNIDADES - ORDEM ALFABÉTICA)\n`;
  text += `   Regra de Ciclo: Revisões X -> S -> L -> M (+20.000 KM)\n`;
  text += `-----------------------------------------------------------------\n`;

  cavalos.forEach((v, idx) => {
    const alert = calculateAlert(v);
    const is8Months = isVehicleTimeBased(v);
    const statusIcon =
      alert.level === 'critical'
        ? (is8Months ? '🚨 [VENCIDA POR DATA]' : '🚨 [VENCIDA]')
        : alert.level === 'warning'
        ? (is8Months ? '⚠️ [ATENÇÃO PRAZO]' : '⚠️ [ATENÇÃO]')
        : '✅ [EM DIA]';

    const saldoText = is8Months
      ? alert.daysRemaining !== undefined && alert.daysRemaining <= 0
        ? `VENCIDA POR DATA: Expirou há ${Math.abs(alert.daysRemaining)} dias em ${alert.targetDate ? formatDatePtBr(alert.targetDate) : 'N/D'}`
        : `Em dia por Prazo: Restam ${alert.daysRemaining ?? 0} dias (Limite em ${alert.targetDate ? formatDatePtBr(alert.targetDate) : 'N/D'})`
      : alert.difference < 0
      ? `VENCIDA por ${Math.abs(alert.difference).toLocaleString('pt-BR')} KM`
      : `Restam ${alert.difference.toLocaleString('pt-BR')} KM`;

    text += `${(idx + 1).toString().padStart(2, '0')}. PLACA: ${v.plate.padEnd(8)} | FROTA: ${v.fleetNumber.padEnd(8)} | STATUS: ${statusIcon}\n`;
    text += `    • KM Atual: ${v.currentMeter.toLocaleString('pt-BR')} KM\n`;
    text += `    • Próxima Programada: ${v.nextRevisionType} aos ${v.nextRevisionMeter.toLocaleString('pt-BR')} KM\n`;
    text += `    • Saldo / Prazo Operacional: ${saldoText}\n`;
    text += `    • Última Feita: ${v.lastMaintenanceType} aos ${v.lastMaintenanceMeter.toLocaleString('pt-BR')} KM (${formatDatePtBr(v.lastMaintenanceDate)})\n`;

    if (is8Months) {
      const days = alert.daysRemaining;
      const targetDate = alert.targetDate ? formatDatePtBr(alert.targetDate) : 'N/D';
      text += `    • ⏱️ Regra Temporal 8 Meses: Vencimento por Data em ${targetDate} (${days !== undefined && days < 0 ? `Vencida há ${Math.abs(days)} dias` : `Restam ${days} dias`}) • Não vence por KM\n`;
    }
    text += `\n`;
  });

  // -------------------------------------------------------------
  // 2. SEÇÃO CARRETAS / SEMI-REBOQUES (ORDEM ALFABÉTICA)
  // -------------------------------------------------------------
  text += `-----------------------------------------------------------------\n`;
  text += `🚛 2. CARRETAS / SEMI-REBOQUES (${carretas.length} UNIDADES - ORDEM ALFABÉTICA)\n`;
  text += `   Controle de Freios: Preventiva (30.000 KM) / Preventiva (50.000 KM)\n`;
  text += `-----------------------------------------------------------------\n`;

  carretas.forEach((v, idx) => {
    const alert = calculateAlert(v);
    const statusIcon =
      alert.level === 'critical' ? '🚨 [VENCIDA]' : alert.level === 'warning' ? '⚠️ [ATENÇÃO]' : '✅ [EM DIA]';

    const saldoText =
      alert.difference < 0
        ? `VENCIDA por ${Math.abs(alert.difference).toLocaleString('pt-BR')} KM`
        : `Restam ${alert.difference.toLocaleString('pt-BR')} KM`;

    text += `${(idx + 1).toString().padStart(2, '0')}. PLACA: ${v.plate.padEnd(8)} | FROTA: ${v.fleetNumber.padEnd(8)} | STATUS: ${statusIcon}\n`;
    text += `    • KM Atual: ${v.currentMeter.toLocaleString('pt-BR')} KM\n`;
    text += `    • Próxima Preventiva: ${v.nextRevisionType} aos ${v.nextRevisionMeter.toLocaleString('pt-BR')} KM\n`;
    text += `    • Saldo Operacional: ${saldoText}\n`;
    text += `    • Última Feita: ${v.lastMaintenanceType} (${formatDatePtBr(v.lastMaintenanceDate)})\n\n`;
  });

  // -------------------------------------------------------------
  // 3. SEÇÃO EQUIPAMENTOS TK (FRIO) (ORDEM ALFABÉTICA)
  // -------------------------------------------------------------
  text += `-----------------------------------------------------------------\n`;
  text += `❄️ 3. EQUIPAMENTOS TK - REFRIGERAÇÃO (${tks.length} UNIDADES - ORDEM ALFABÉTICA)\n`;
  text += `   Controle por Horímetro: Preventivas de 1.000h, 1.500h e Regra Especial de 500h (Troca de Filtro)\n`;
  text += `-----------------------------------------------------------------\n`;

  tks.forEach((v, idx) => {
    const alert = calculateAlert(v);
    const isTk500h = isTkFilter500hPlate(v.plate) || v.isTk500hFilterRule;
    const statusIcon =
      alert.level === 'critical' ? '🚨 [VENCIDA]' : alert.level === 'warning' ? '⚠️ [ATENÇÃO]' : '✅ [EM DIA]';

    const saldoText =
      alert.difference < 0
        ? `VENCIDA por ${Math.abs(alert.difference).toLocaleString('pt-BR')} HORAS`
        : `Restam ${alert.difference.toLocaleString('pt-BR')} HORAS`;

    const tag500h = isTk500h ? ' 🛢️ [REGRA 500H - TROCA DE FILTRO]' : '';

    text += `${(idx + 1).toString().padStart(2, '0')}. PLACA: ${v.plate.padEnd(8)} | FROTA: ${v.fleetNumber.padEnd(8)} | STATUS: ${statusIcon}${tag500h}\n`;
    text += `    • Horímetro Atual: ${v.currentMeter.toLocaleString('pt-BR')} HORAS\n`;
    text += `    • Próxima Preventiva: ${v.nextRevisionType} às ${v.nextRevisionMeter.toLocaleString('pt-BR')} HORAS\n`;
    text += `    • Saldo Operacional: ${saldoText}\n`;
    text += `    • Última Feita: ${v.lastMaintenanceType} (${formatDatePtBr(v.lastMaintenanceDate)})\n\n`;
  });

  text += `=================================================================\n`;
  text += `Sistema de Gestão de Manutenção de Frotas\n`;
  text += `Mensagem gerada e expedida automaticamente para controle operacional.\n`;
  text += `=================================================================\n`;

  return text;
}

/**
 * Gera documento HTML para envio de e-mail corporativo formatado
 */
export function generateEmailHtmlReport(
  vehicles: Vehicle[],
  options?: Partial<EmailDispatchOptions>
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const cavalos = sortByPlateAlphabetical(vehicles.filter((v) => v.type === 'cavalo'));
  const carretas = sortByPlateAlphabetical(vehicles.filter((v) => v.type === 'carreta'));
  const tks = sortByPlateAlphabetical(vehicles.filter((v) => v.type === 'tk'));

  const allAlerts = vehicles.map((v) => calculateAlert(v));
  const criticalCount = allAlerts.filter((a) => a.level === 'critical').length;
  const warningCount = allAlerts.filter((a) => a.level === 'warning').length;
  const okCount = allAlerts.filter((a) => a.level === 'ok').length;

  const renderTableRows = (list: Vehicle[]) => {
    return list
      .map((v) => {
        const alert = calculateAlert(v);
        const isCritical = alert.level === 'critical';
        const isWarning = alert.level === 'warning';

        const statusBg = isCritical
          ? '#ffe4e6'
          : isWarning
          ? '#fef3c7'
          : '#dcfce7';
        const statusColor = isCritical
          ? '#9f1239'
          : isWarning
          ? '#92400e'
          : '#166534';
        const is8m = isVehicleTimeBased(v);
        const isTk500h = isTkFilter500hPlate(v.plate) || v.isTk500hFilterRule;

        const statusLabel = isCritical
          ? (is8m ? 'VENCIDA (DATA)' : 'VENCIDA')
          : isWarning
          ? (is8m ? 'ATENÇÃO PRAZO' : 'ATENÇÃO')
          : (is8m ? 'EM DIA (8M)' : 'EM DIA');

        const saldoDisplay = is8m
          ? alert.daysRemaining !== undefined && alert.daysRemaining <= 0
            ? `<strong style="color:#b91c1c;">Vencida há ${Math.abs(alert.daysRemaining)} dias (${formatDatePtBr(alert.targetDate)})</strong>`
            : `<span style="color:#7e22ce; font-weight:600;">Restam ${alert.daysRemaining ?? 0} dias (${formatDatePtBr(alert.targetDate)})</span>`
          : alert.difference < 0
            ? `<strong style="color:#b91c1c;">-${Math.abs(alert.difference).toLocaleString('pt-BR')} ${v.meterUnit}</strong>`
            : `<span style="color:#15803d;">+${alert.difference.toLocaleString('pt-BR')} ${v.meterUnit}</span>`;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-family: monospace; font-weight: bold; color: #0f172a;">
              ${v.plate}
              ${is8m ? '<br><span style="font-size: 10px; color: #7e22ce; font-weight: bold;">⏱️ 8 Meses</span>' : ''}
              ${isTk500h ? '<br><span style="font-size: 10px; color: #0891b2; font-weight: bold;">🛢️ Regra 500H (Filtro)</span>' : ''}
            </td>
            <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${v.fleetNumber}</td>
            <td style="padding: 10px 12px; color: #0f172a; font-family: monospace; font-size: 13px;">${v.currentMeter.toLocaleString('pt-BR')} ${v.meterUnit}</td>
            <td style="padding: 10px 12px; color: #1e293b; font-size: 13px; font-weight: 600;">${v.nextRevisionType}</td>
            <td style="padding: 10px 12px; color: #334155; font-family: monospace; font-size: 13px;">${v.nextRevisionMeter.toLocaleString('pt-BR')} ${v.meterUnit}</td>
            <td style="padding: 10px 12px; font-size: 13px;">${saldoDisplay}</td>
            <td style="padding: 10px 12px;">
              <span style="background-color: ${statusBg}; color: ${statusColor}; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                ${statusLabel}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório de Manutenções da Frota</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
      <div style="max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 32px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Relatório de Manutenção Preventiva de Frota</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">
            Gerado em ${dateStr} às ${timeStr} • Martin Brower CDPR
          </p>
        </div>

        <!-- Indicadores -->
        <div style="display: flex; background: #f1f5f9; padding: 16px 32px; border-bottom: 1px solid #e2e8f0; gap: 16px;">
          <div style="flex: 1; background: #ffffff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total da Frota</div>
            <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px;">${vehicles.length}</div>
          </div>
          <div style="flex: 1; background: #fff1f2; padding: 12px 16px; border-radius: 8px; border: 1px solid #fecdd3;">
            <div style="font-size: 11px; font-weight: bold; color: #e11d48; text-transform: uppercase;">Revisões Vencidas</div>
            <div style="font-size: 22px; font-weight: 900; color: #be123c; margin-top: 4px;">${criticalCount}</div>
          </div>
          <div style="flex: 1; background: #fffbeb; padding: 12px 16px; border-radius: 8px; border: 1px solid #fde68a;">
            <div style="font-size: 11px; font-weight: bold; color: #d97706; text-transform: uppercase;">Próximas de Vencer</div>
            <div style="font-size: 22px; font-weight: 900; color: #b45309; margin-top: 4px;">${warningCount}</div>
          </div>
          <div style="flex: 1; background: #f0fdf4; padding: 12px 16px; border-radius: 8px; border: 1px solid #bbf7d0;">
            <div style="font-size: 11px; font-weight: bold; color: #16a34a; text-transform: uppercase;">Em Dia</div>
            <div style="font-size: 22px; font-weight: 900; color: #15803d; margin-top: 4px;">${okCount}</div>
          </div>
        </div>

        <div style="padding: 24px 32px;">
          ${
            options?.notes
              ? `
            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
              <strong style="color: #0369a1; font-size: 12px; display: block; margin-bottom: 4px;">MENSAGEM OPERACIONAL:</strong>
              <span style="color: #0c4a6e; font-size: 13px;">${options.notes}</span>
            </div>
          `
              : ''
          }

          <!-- 1. CAVALOS -->
          <h2 style="font-size: 16px; font-weight: 800; color: #0369a1; border-bottom: 2px solid #bae6fd; padding-bottom: 8px; margin-top: 16px;">
            🚚 1. Cavalos Mecânicos (${cavalos.length} Unidades - Ordem Alfabética)
          </h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 32px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 12px; color: #475569;">
                <th style="padding: 8px 12px;">PLACA</th>
                <th style="padding: 8px 12px;">FROTA</th>
                <th style="padding: 8px 12px;">KM ATUAL</th>
                <th style="padding: 8px 12px;">PRÓXIMA</th>
                <th style="padding: 8px 12px;">META KM</th>
                <th style="padding: 8px 12px;">SALDO KM</th>
                <th style="padding: 8px 12px;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(cavalos)}
            </tbody>
          </table>

          <!-- 2. CARRETAS -->
          <h2 style="font-size: 16px; font-weight: 800; color: #b45309; border-bottom: 2px solid #fde68a; padding-bottom: 8px; margin-top: 24px;">
            🚛 2. Carretas / Semi-Reboques (${carretas.length} Unidades - Ordem Alfabética)
          </h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 32px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 12px; color: #475569;">
                <th style="padding: 8px 12px;">PLACA</th>
                <th style="padding: 8px 12px;">FROTA</th>
                <th style="padding: 8px 12px;">KM ATUAL</th>
                <th style="padding: 8px 12px;">PRÓXIMA</th>
                <th style="padding: 8px 12px;">META KM</th>
                <th style="padding: 8px 12px;">SALDO KM</th>
                <th style="padding: 8px 12px;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(carretas)}
            </tbody>
          </table>

          <!-- 3. TKS -->
          <h2 style="font-size: 16px; font-weight: 800; color: #0e7490; border-bottom: 2px solid #a5f3fc; padding-bottom: 8px; margin-top: 24px;">
            ❄️ 3. Equipamentos TK - Frio (${tks.length} Unidades - Ordem Alfabética)
          </h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 12px; color: #475569;">
                <th style="padding: 8px 12px;">PLACA</th>
                <th style="padding: 8px 12px;">FROTA</th>
                <th style="padding: 8px 12px;">HORÍMETRO</th>
                <th style="padding: 8px 12px;">PRÓXIMA</th>
                <th style="padding: 8px 12px;">META HORAS</th>
                <th style="padding: 8px 12px;">SALDO HORAS</th>
                <th style="padding: 8px 12px;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(tks)}
            </tbody>
          </table>
        </div>

        <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          Controle Operacional de Manutenção Preventiva • Sistema de Frotas Martin Brower CDPR
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Cria link direto para abrir a tela de redação do Gmail Web com tudo preenchido
 */
export function createGmailWebUrl(
  toEmail: string,
  subject: string,
  bodyText: string
): string {
  // Limita o tamanho para evitar truncamento na barra de URL
  const safeBody = bodyText.length > 7000 ? bodyText.slice(0, 7000) + '\n\n[... Relatório completo disponível no painel ...]' : bodyText;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(safeBody)}`;
}

/**
 * Cria link direto para abrir a tela de redação do Outlook Web
 */
export function createOutlookWebUrl(
  toEmail: string,
  subject: string,
  bodyText: string
): string {
  const safeBody = bodyText.length > 4000 ? bodyText.slice(0, 4000) + '\n\n[... Relatório completo disponível no painel ...]' : bodyText;
  return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(toEmail.trim())}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(safeBody)}`;
}

/**
 * Gera arquivo de e-mail padronizado (.EML) que pode ser aberto no Outlook, Thunderbird ou Mail do Windows/Mac
 * e já abre no modo de rascunho com o botão "Enviar" pronto!
 */
export function generateEmlContent(
  toEmail: string,
  ccEmail: string = '',
  subject: string,
  bodyText: string,
  htmlBody?: string
): string {
  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const dateStr = new Date().toUTCString();

  let eml = `X-Unsent: 1\r\n`;
  eml += `Date: ${dateStr}\r\n`;
  eml += `To: ${toEmail.trim()}\r\n`;
  if (ccEmail && ccEmail.trim()) {
    eml += `Cc: ${ccEmail.trim()}\r\n`;
  }
  eml += `Subject: ${subject}\r\n`;
  eml += `MIME-Version: 1.0\r\n`;
  eml += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

  // Parte texto plano
  eml += `--${boundary}\r\n`;
  eml += `Content-Type: text/plain; charset="utf-8"\r\n`;
  eml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  eml += `${bodyText}\r\n\r\n`;

  // Parte HTML se fornecido
  if (htmlBody) {
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/html; charset="utf-8"\r\n`;
    eml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
    eml += `${htmlBody}\r\n\r\n`;
  }

  eml += `--${boundary}--\r\n`;
  return eml;
}

/**
 * Faz download do arquivo .eml para o computador do usuário
 */
export function downloadEmlFile(
  filename: string,
  toEmail: string,
  ccEmail: string = '',
  subject: string,
  bodyText: string,
  htmlBody?: string
): void {
  const emlContent = generateEmlContent(toEmail, ccEmail, subject, bodyText, htmlBody);
  const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.eml') ? filename : `${filename}.eml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copia relatório com suporte a HTML rico e texto plano para o clipboard
 */
export async function copyRichEmailToClipboard(
  bodyText: string,
  htmlBody: string
): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const textBlob = new Blob([bodyText], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlBody], { type: 'text/html' });
      const item = new ClipboardItem({
        'text/plain': textBlob,
        'text/html': htmlBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Falha na API ClipboardItem, usando fallback writeText:', err);
  }

  // Fallback padrão
  try {
    await navigator.clipboard.writeText(bodyText);
    return true;
  } catch (err) {
    console.error('Erro no clipboard fallback:', err);
    return false;
  }
}

/**
 * Cria URL mailto: com limite seguro para abertura imediata no cliente de e-mail do sistema
 */
export function createMailtoUrl(
  toEmail: string,
  subject: string,
  bodyText: string
): string {
  // Limitar o corpo se for excessivamente longo para mailto URL
  const trimmedBody = bodyText.length > 1800 ? bodyText.slice(0, 1800) + '\n\n[... Relatório completo anexado ou disponível no sistema ...]' : bodyText;
  return `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(trimmedBody)}`;
}

/**
 * Simula e registra o disparo corporativo do e-mail
 */
export async function simulateEmailDispatch(
  vehicles: Vehicle[],
  options: EmailDispatchOptions
): Promise<EmailDispatchResult> {
  // Simular latência de rede/servidor SMTP
  await new Promise((resolve) => setTimeout(resolve, 800));

  const allAlerts = vehicles.map((v) => calculateAlert(v));
  const cavalos = vehicles.filter((v) => v.type === 'cavalo');
  const carretas = vehicles.filter((v) => v.type === 'carreta');
  const tks = vehicles.filter((v) => v.type === 'tk');

  const result: EmailDispatchResult = {
    success: true,
    timestamp: new Date().toISOString(),
    recipient: options.toEmail,
    messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    summary: {
      total: vehicles.length,
      cavalos: cavalos.length,
      carretas: carretas.length,
      tks: tks.length,
      critical: allAlerts.filter((a) => a.level === 'critical').length,
      warning: allAlerts.filter((a) => a.level === 'warning').length,
      ok: allAlerts.filter((a) => a.level === 'ok').length,
    },
  };

  // Salvar no histórico local de disparos
  try {
    const existing = JSON.parse(localStorage.getItem('fleet_email_dispatches') || '[]');
    existing.unshift({
      ...result,
      subject: options.subject,
      notes: options.notes,
    });
    localStorage.setItem('fleet_email_dispatches', JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    console.error('Erro ao registrar disparo no localStorage:', e);
  }

  return result;
}

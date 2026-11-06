import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vehicle, MaintenanceRecord } from '../types';
import {
  calculateAlert,
  formatMeter,
  getVehicleTypeLabel,
  isCarreta30k,
  isCarreta50k,
  getCarretaIntervalKm,
  isTimeBasedCavalo,
  isVehicleTimeBased,
  formatDatePtBr,
} from './maintenanceCalculations';

/**
 * Exporta a planilha completa em formato Excel (.xlsx) com múltiplas abas
 */
export function exportFleetToExcel(vehicles: Vehicle[], history: MaintenanceRecord[]): void {
  const wb = XLSX.utils.book_new();

  // 1. Aba: Resumo Geral & Alertas
  const generalData = vehicles.map((v) => {
    const alert = calculateAlert(v);
    const statusLabel =
      alert.level === 'critical'
        ? 'CRÍTICO / VENCIDA'
        : alert.level === 'warning'
        ? 'ATENÇÃO / PRÓXIMO'
        : 'EM DIA (REGULAR)';

    return {
      'Placa': v.plate,
      'Identificador': v.fleetNumber && !/^(CAV|TK|CRT)-\d+/i.test(v.fleetNumber) ? v.fleetNumber : v.plate,
      'Tipo de Veículo': getVehicleTypeLabel(v.type),
      'Categoria': v.type === 'cavalo' ? 'Cavalo Mecânico' : (v.type === 'tk' ? 'Thermo King' : 'Carreta'),
      'Ano': v.year,
      'Medição Atual': `${v.currentMeter.toLocaleString('pt-BR')} ${v.meterUnit}`,
      'Próxima Revisão': v.nextRevisionType,
      'Meta da Revisão': `${v.nextRevisionMeter.toLocaleString('pt-BR')} ${v.meterUnit}`,
      'Saldo Restante': `${alert.difference.toLocaleString('pt-BR')} ${v.meterUnit}`,
      'Status de Alerta': statusLabel,
      'Última Manutenção': `${v.lastMaintenanceType} em ${v.lastMaintenanceDate}`,
      'Conjunto Engatado': [v.coupledCarretaPlate, v.coupledTkPlate].filter(Boolean).join(' + ') || '-',
      'Observações Operacionais': v.observations || '-',
    };
  });
  const wsGeneral = XLSX.utils.json_to_sheet(generalData);
  XLSX.utils.book_append_sheet(wb, wsGeneral, 'Status Geral Frota');

  // 2. Aba: Cavalos Mecânicos (Revisão X, S, L, M)
  const cavalos = vehicles.filter((v) => v.type === 'cavalo');
  const cavalosData = cavalos.map((v) => {
    const alert = calculateAlert(v);
    const is8m = isVehicleTimeBased(v);
    const statusStr = is8m
      ? alert.level === 'critical'
        ? 'VENCIDA POR DATA'
        : alert.level === 'warning'
        ? 'ATENÇÃO PRAZO'
        : 'EM DIA (8M)'
      : alert.level === 'critical'
      ? 'VENCIDA'
      : alert.level === 'warning'
      ? 'ATENÇÃO'
      : 'OK';

    const saldoOrPrazo = is8m
      ? alert.daysRemaining !== undefined && alert.daysRemaining <= 0
        ? `Vencida há ${Math.abs(alert.daysRemaining)} dias (${formatDatePtBr(alert.targetDate)})`
        : `Restam ${alert.daysRemaining ?? 0} dias (${formatDatePtBr(alert.targetDate)})`
      : `${alert.difference} KM`;

    const currentLockKm = v.cavaloTaraKm || 40000;
    const currentAlertKm = Math.round(currentLockKm / 2);

    return {
      'Placa Cavalo': v.plate,
      'Tipo': 'Cavalo Mecânico',
      'Trava KM': `${currentLockKm.toLocaleString('pt-BR')} KM`,
      'Regra de Vencimento': is8m
        ? `Data (8 Meses) • Trava ${currentLockKm.toLocaleString('pt-BR')} KM (Alerta ${currentAlertKm.toLocaleString('pt-BR')} KM X)`
        : `Trava de Ciclo ${currentLockKm.toLocaleString('pt-BR')} KM (Alerta aos ${currentAlertKm.toLocaleString('pt-BR')} KM para Revisão X - Exceto L)`,
      'KM Atual': v.currentMeter,
      'Última Revisão Realizada': v.lastMaintenanceType,
      'KM da Última': v.lastMaintenanceMeter,
      'Próxima Revisão Programada': v.nextRevisionType,
      'KM Prevista': v.nextRevisionMeter,
      'Saldo / Prazo': saldoOrPrazo,
      'Status': statusStr,
      'Carreta Acoplada': v.coupledCarretaPlate || 'Nenhuma',
      'TK Acoplado': v.coupledTkPlate || 'Nenhum',
    };
  });
  const wsCavalos = XLSX.utils.json_to_sheet(cavalosData);
  XLSX.utils.book_append_sheet(wb, wsCavalos, 'Cavalos (Rev X, S, L, M)');

  // 3. Aba: Carretas (Preventiva e Corretiva de Freios 30k e 50k)
  const carretas = vehicles.filter((v) => v.type === 'carreta');
  const carretasData = carretas.map((v) => {
    const alert = calculateAlert(v);
    const intervalKm = getCarretaIntervalKm(v.plate);
    const kmNoCiclo = Math.max(0, v.currentMeter - v.lastMaintenanceMeter);
    return {
      'Placa Carreta': v.plate,
      'Frota': v.fleetNumber,
      'Grupo Trava': 'Trava 60.000 KM (Atenção aos 50K)',
      'Porte / Eixos': `${v.bodySize || '-'} • ${v.axlesConfig || '-'}`,
      'Odômetro Atual (KM)': v.currentMeter,
      'KM Base Última Revisão': v.lastMaintenanceMeter,
      'KM Rodados no Ciclo Atual': kmNoCiclo,
      'Trava de KM': intervalKm,
      'Saldo KM até Revisão': alert.difference,
      'Status Freios': alert.level === 'critical' ? 'VENCIDA' : alert.level === 'warning' ? 'ATENÇÃO' : 'OK',
      'Última Manutenção Freios': v.lastMaintenanceType,
      'Próxima Revisão Freios': v.nextRevisionType,
      'Odômetro Alvo Programado': v.nextRevisionMeter,
      'Regra Operacional': `Ao revisar reseta KM para 0 e roda novos ${intervalKm.toLocaleString('pt-BR')} KM (Atenção aos 50K • Trava 60K)`,
      'TK Acoplado': v.coupledTkPlate || 'Nenhum',
    };
  });
  const wsCarretas = XLSX.utils.json_to_sheet(carretasData);
  XLSX.utils.book_append_sheet(wb, wsCarretas, 'Carretas (Trava 60K)');

  // 4. Aba: Equipamentos TK (1.000h e 1.500h)
  const tks = vehicles.filter((v) => v.type === 'tk');
  const tksData = tks.map((v) => {
    const alert = calculateAlert(v);
    return {
      'Placa/Identificação TK': v.plate,
      'Equipamento': 'Thermo King Refrigeração',
      'Porte': v.bodySize || 'Padrão',
      'Horímetro Atual (Horas)': v.currentMeter,
      'Última Preventiva TK': v.lastMaintenanceType,
      'Horas na Última': v.lastMaintenanceMeter,
      'Próxima Preventiva TK': v.nextRevisionType,
      'Meta Horímetro (1000h/1500h)': v.nextRevisionMeter,
      'Horas Restantes': alert.difference,
      'Status TK': alert.level === 'critical' ? 'VENCIDA' : alert.level === 'warning' ? 'ATENÇÃO' : 'OK',
      'Caminhão/Carreta Vinculado': v.coupledCarretaPlate || v.coupledTkPlate || 'Nenhum',
    };
  });
  const wsTks = XLSX.utils.json_to_sheet(tksData);
  XLSX.utils.book_append_sheet(wb, wsTks, 'TK (1000h e 1500h)');

  // 5. Aba: Histórico de Manutenções Realizadas
  const historyData = history.map((h) => ({
    'Data': h.date,
    'Placa': h.plate,
    'Tipo': getVehicleTypeLabel(h.vehicleType),
    'Revisão': h.revisionType,
    'Executada (SIM/NÃO)': h.executionStatus || (h.executed !== false ? 'SIM' : 'NÃO'),
    'KM/Horas': h.meterReading,
    'Oficina/Mecânico': `${h.workshop} ${h.technician ? `(${h.technician})` : ''}`,
    'Custo (R$)': h.cost || 0,
    'Peças e Itens Trocados': (h.partsReplaced || []).join('; '),
    'Próxima Meta Registrada': h.nextScheduledMeter,
    'Observações': h.notes || '-',
  }));
  const wsHistory = XLSX.utils.json_to_sheet(historyData);
  XLSX.utils.book_append_sheet(wb, wsHistory, 'Histórico de Manutenções');

  const now = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Relatorio_Manutencao_Preventiva_Frota_${now}.xlsx`);
}

/**
 * Exporta relatório operacional executivo em formato PDF
 */
export function exportFleetToPdf(vehicles: Vehicle[], history: MaintenanceRecord[]): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Contadores de alertas
  const criticalCount = vehicles.filter((v) => calculateAlert(v).level === 'critical').length;
  const warningCount = vehicles.filter((v) => calculateAlert(v).level === 'warning').length;
  const okCount = vehicles.filter((v) => calculateAlert(v).level === 'ok').length;

  // Cabeçalho estilizado
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 842, 65, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GERENCIAMENTO DE MANUTENÇÃO PREVENTIVA DE FROTA', 40, 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `Relatório Operacional das Frotas (Cavalos: Rev X/S/L/M | Carretas: Freios 30k/50k | TK: 1.000h/1.500h) • Emitido em: ${dateStr} às ${timeStr}`,
    40,
    48
  );

  // Faixa de resumo de indicadores
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(40, 75, 762, 38, 4, 4, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total da Frota: ${vehicles.length} unidades`, 55, 98);

  // Vencidas
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`CRÍTICO / VENCIDAS: ${criticalCount}`, 230, 98);

  // Atenção
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`PRÓXIMAS DA REVISÃO: ${warningCount}`, 430, 98);

  // Em dia
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`EM DIA (REGULARES): ${okCount}`, 630, 98);

  // Tabela Principal de Veículos e Alertas
  const tableData = vehicles.map((v) => {
    const alert = calculateAlert(v);
    const is8m = isVehicleTimeBased(v);
    const statusText = is8m
      ? alert.level === 'critical'
        ? `VENCIDA DATA (-${Math.abs(alert.daysRemaining ?? 0)} dias)`
        : alert.level === 'warning'
        ? `ATENÇÃO (${alert.daysRemaining ?? 0}d rest.)`
        : `EM DIA (${alert.daysRemaining ?? 0}d rest.)`
      : alert.level === 'critical'
      ? `VENCIDA (-${Math.abs(alert.difference).toLocaleString('pt-BR')} ${v.meterUnit})`
      : alert.level === 'warning'
      ? `ATENÇÃO (${alert.difference.toLocaleString('pt-BR')} ${v.meterUnit})`
      : `EM DIA (+${alert.difference.toLocaleString('pt-BR')} ${v.meterUnit})`;

    return [
      v.plate,
      v.fleetNumber,
      getVehicleTypeLabel(v.type).replace('Equipamento ', ''),
      v.type === 'cavalo' ? 'Cavalo Mecânico' : (v.type === 'tk' ? 'Thermo King' : 'Semirreboque'),
      `${v.currentMeter.toLocaleString('pt-BR')} ${v.meterUnit}`,
      v.nextRevisionType,
      `${v.nextRevisionMeter.toLocaleString('pt-BR')} ${v.meterUnit}`,
      statusText,
      v.lastMaintenanceType.substring(0, 22),
    ];
  });

  autoTable(doc, {
    startY: 125,
    head: [
      [
        'Placa',
        'Frota',
        'Tipo',
        'Modelo',
        'Medição Atual',
        'Próxima Revisão Programada',
        'Meta Alvo',
        'Status / Saldo',
        'Última Revisão',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 55 },
      1: { halign: 'center', cellWidth: 50 },
      2: { cellWidth: 70 },
      3: { cellWidth: 120 },
      4: { halign: 'right', cellWidth: 75 },
      5: { cellWidth: 125, fontStyle: 'bold' },
      6: { halign: 'right', cellWidth: 75 },
      7: { halign: 'center', cellWidth: 105, fontStyle: 'bold' },
      8: { cellWidth: 87 },
    },
    didParseCell: (data) => {
      // Colorir a coluna de status
      if (data.section === 'body' && data.column.index === 7) {
        const text = String(data.cell.raw);
        if (text.includes('VENCIDA')) {
          data.cell.styles.textColor = [190, 18, 60]; // rose-700
          data.cell.styles.fillColor = [255, 241, 242]; // rose-50
        } else if (text.includes('ATENÇÃO')) {
          data.cell.styles.textColor = [180, 83, 9]; // amber-700
          data.cell.styles.fillColor = [254, 243, 199]; // amber-50
        } else {
          data.cell.styles.textColor = [4, 120, 87]; // emerald-700
          data.cell.styles.fillColor = [236, 253, 245]; // emerald-50
        }
      }
    },
    margin: { left: 40, right: 40 },
  });

  // Se houver espaço ou em nova página, adiciona histórico recente de manutenções
  const finalY = (doc as any).lastAutoTable.finalY || 450;
  if (finalY > 440) {
    doc.addPage();
  }

  const startHistoryY = finalY > 440 ? 50 : finalY + 25;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ÚLTIMAS MANUTENÇÕES EXECUTADAS NA OFICINA', 40, startHistoryY);

  const historyRows = history.slice(0, 15).map((h) => [
    h.date,
    h.plate,
    getVehicleTypeLabel(h.vehicleType).split(' ')[0],
    h.revisionType,
    h.executionStatus || (h.executed !== false ? 'SIM' : 'NÃO'),
    `${h.meterReading.toLocaleString('pt-BR')}`,
    h.workshop,
    h.cost ? `R$ ${h.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
  ]);

  autoTable(doc, {
    startY: startHistoryY + 10,
    head: [['Data', 'Placa', 'Tipo', 'Revisão', 'Status', 'KM/Horas', 'Oficina / Mecânico', 'Custo Total']],
    body: historyRows,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    margin: { left: 40, right: 40 },
  });

  // Rodapé com número de páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Gestão Operacional de Manutenção de Frotas • Página ${i} de ${pageCount} • Confidencial Interno`,
      421,
      575,
      { align: 'center' }
    );
  }

  const fileName = `Relatorio_Manutencao_Operacional_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

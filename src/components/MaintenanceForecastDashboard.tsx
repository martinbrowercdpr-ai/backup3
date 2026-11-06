import React, { useState, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  Truck,
  Container,
  Snowflake,
  TrendingUp,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Info,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
  Save,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Vehicle, VehicleType, MaintenanceRecord } from '../types';
import {
  generateMaintenanceForecast,
  CAVALO_REVISION_COSTS,
  TK_REVISION_COSTS,
  CARRETA_REVISION_COSTS,
  formatCurrencyPtBr,
  MonthForecastGroup,
  ForecastItem,
  DEFAULT_MONTHLY_KM_CAVALO,
  DEFAULT_MONTHLY_KM_CARRETA,
  DEFAULT_MONTHLY_HOURS_TK,
  getStoredPremissas,
  saveStoredPremissas,
} from '../utils/maintenanceForecasting';
import { isTkFilter500hPlate } from '../utils/maintenanceCalculations';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MaintenanceForecastDashboardProps {
  vehicles: Vehicle[];
  history?: MaintenanceRecord[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onOpenRegisterMaintenance?: (vehicle: Vehicle) => void;
  onOpenSyncDailySheet?: () => void;
  onOpenRevisionCatalog?: (tab?: 'REVISAO S' | 'REVISAO M' | 'REVISAO L' | 'REVISAO X' | 'CICLO') => void;
}

export const MaintenanceForecastDashboard: React.FC<MaintenanceForecastDashboardProps> = ({
  vehicles,
  history,
  onSelectVehicle,
  onOpenRegisterMaintenance,
  onOpenSyncDailySheet,
  onOpenRevisionCatalog,
}) => {
  // Configuração de premissas de projeção (Carregadas com fallback oficial 4.530 / 5.755 / 133)
  const initialPremissas = useMemo(() => getStoredPremissas(), []);
  const [monthlyKmCavalo, setMonthlyKmCavalo] = useState<number>(initialPremissas.monthlyKmCavalo);
  const [monthlyKmCarreta, setMonthlyKmCarreta] = useState<number>(initialPremissas.monthlyKmCarreta);
  const [monthlyHoursTk, setMonthlyHoursTk] = useState<number>(initialPremissas.monthlyHoursTk);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPriceTable, setShowPriceTable] = useState<boolean>(false);
  const [forecastViewMode, setForecastViewMode] = useState<'cards' | 'table'>('cards');
  const [premissasSavedSuccess, setPremissasSavedSuccess] = useState<boolean>(false);

  const handleSavePremissas = () => {
    saveStoredPremissas({
      monthlyKmCavalo,
      monthlyKmCarreta,
      monthlyHoursTk,
    });
    setPremissasSavedSuccess(true);
    setTimeout(() => {
      setPremissasSavedSuccess(false);
    }, 4000);
  };

  const handleResetPremissas = () => {
    setMonthlyKmCavalo(DEFAULT_MONTHLY_KM_CAVALO);
    setMonthlyKmCarreta(DEFAULT_MONTHLY_KM_CARRETA);
    setMonthlyHoursTk(DEFAULT_MONTHLY_HOURS_TK);
    saveStoredPremissas({
      monthlyKmCavalo: DEFAULT_MONTHLY_KM_CAVALO,
      monthlyKmCarreta: DEFAULT_MONTHLY_KM_CARRETA,
      monthlyHoursTk: DEFAULT_MONTHLY_HOURS_TK,
    });
    setPremissasSavedSuccess(true);
    setTimeout(() => {
      setPremissasSavedSuccess(false);
    }, 4000);
  };

  // Filtros
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | VehicleType>('all');
  const [filterTk500hOnly, setFilterTk500hOnly] = useState<boolean>(false);
  const [filterTk1500hOnly, setFilterTk1500hOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Geração da projeção com base nos parâmetros e reconciliação automática com histórico
  const forecastData = useMemo(() => {
    return generateMaintenanceForecast(vehicles, {
      monthlyKmCavalo,
      monthlyKmCarreta,
      monthlyHoursTk,
      horizonMonths: 15,
      history,
    });
  }, [vehicles, history, monthlyKmCavalo, monthlyKmCarreta, monthlyHoursTk]);

  // Grupos filtrados
  const filteredGroups = useMemo(() => {
    return forecastData.groups
      .map((group) => {
        let items = group.items;

        if (filterTk500hOnly) {
          items = items.filter((item) => item.type === 'tk' && isTkFilter500hPlate(item.plate));
        } else if (filterTk1500hOnly) {
          items = items.filter((item) => item.type === 'tk' && !isTkFilter500hPlate(item.plate));
        } else if (selectedType !== 'all') {
          items = items.filter((item) => item.type === selectedType);
        }

        const q = searchQuery.toLowerCase().trim();
        if (q) {
          items = items.filter(
            (item) =>
              (item.plate || '').toLowerCase().includes(q) ||
              (item.fleetNumber || '').toLowerCase().includes(q) ||
              (item.revisionType || '').toLowerCase().includes(q) ||
              (item.serviceCategory || '').toLowerCase().includes(q)
          );
        }

        const cavaloItems = items.filter((i) => i.type === 'cavalo');
        const carretaItems = items.filter((i) => i.type === 'carreta');
        const tkItems = items.filter((i) => i.type === 'tk');

        const cavaloCount = cavaloItems.length;
        const carretaCount = carretaItems.length;
        const tkCount = tkItems.length;

        const totalLaborCost = items.reduce((acc, i) => acc + (i.laborCost || 0), 0);
        const totalPartsCost = items.reduce((acc, i) => acc + (i.partsCost || 0), 0);
        const totalCost = items.reduce((acc, i) => acc + (i.totalCost || 0), 0);

        const cavaloCost = cavaloItems.reduce((acc, i) => acc + (i.totalCost || 0), 0);
        const carretaCost = carretaItems.reduce((acc, i) => acc + (i.totalCost || 0), 0);
        const tkCost = tkItems.reduce((acc, i) => acc + (i.totalCost || 0), 0);

        return {
          ...group,
          items,
          totalVehicles: items.length,
          cavaloCount,
          carretaCount,
          tkCount,
          totalLaborCost,
          totalPartsCost,
          totalCost,
          cavaloCost,
          carretaCost,
          tkCost,
        };
      })
      .filter((group) => {
        if (selectedMonthKey !== 'all' && group.monthKey !== selectedMonthKey) {
          return false;
        }
        return group.items.length > 0;
      });
  }, [forecastData, selectedMonthKey, selectedType, filterTk500hOnly, filterTk1500hOnly, searchQuery]);

  // Totais filtrados
  const filteredTotals = useMemo(() => {
    let totalVehicles = 0;
    let totalLabor = 0;
    let totalParts = 0;
    let total = 0;
    let cavaloCount = 0;
    let carretaCount = 0;
    let tkCount = 0;
    let cavaloCost = 0;
    let carretaCost = 0;
    let tkCost = 0;

    filteredGroups.forEach((g) => {
      totalVehicles += g.totalVehicles;
      totalLabor += g.totalLaborCost;
      totalParts += g.totalPartsCost;
      total += g.totalCost;
      cavaloCount += g.cavaloCount;
      carretaCount += g.carretaCount;
      tkCount += g.tkCount;
      cavaloCost += g.cavaloCost || 0;
      carretaCost += g.carretaCost || 0;
      tkCost += g.tkCost || 0;
    });

    return {
      totalVehicles,
      totalLabor,
      totalParts,
      total,
      cavaloCount,
      carretaCount,
      tkCount,
      cavaloCost,
      carretaCost,
      tkCost,
    };
  }, [filteredGroups]);

  // Exportar Previsão para Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Aba Consolidada por Placa
    const rows: any[] = [];
    filteredGroups.forEach((g) => {
      g.items.forEach((item) => {
        rows.push({
          Mês: g.monthLabel,
          Placa: item.plate,
          Frota: item.fleetNumber,
          Categoria: item.type === 'cavalo' ? 'Cavalo Mecânico' : item.type === 'carreta' ? 'Semirreboque' : 'Thermo King (TK)',
          'Revisão Prevista': item.revisionType,
          Serviço: item.serviceCategory,
          'Mão de Obra (R$)': item.laborCost,
          'Peças/Insumos (R$)': item.partsCost,
          'Total Previsto (R$)': item.totalCost,
          'Medição Atual': `${item.currentMeter.toLocaleString('pt-BR')} ${item.meterUnit}`,
          'Meta Revisão': `${item.projectedMeter.toLocaleString('pt-BR')} ${item.meterUnit}`,
          'Critério de Previsão': item.explanation,
        });
      });
    });

    const ws1 = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Cronograma Placas');

    // 2. Aba Resumo Mensal
    const summaryRows = forecastData.groups.map((g) => ({
      Mês: g.monthLabel,
      'Total Placas': g.totalVehicles,
      'Cavalos': g.cavaloCount,
      'Carretas': g.carretaCount,
      'TKs': g.tkCount,
      'Total Mão de Obra (R$)': g.totalLaborCost,
      'Total Peças (R$)': g.totalPartsCost,
      'Custo Total Orçado (R$)': g.totalCost,
    }));
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Fluxo de Caixa Mensal');

    // 3. Aba Tabela de Preços Referência
    const pricesRows = [
      { Segmento: 'Cavalo Scania (CVM)', Revisão: 'REVISÃO L', 'Mão de Obra (R$)': CAVALO_REVISION_COSTS['REVISAO L'].laborCost, 'Total (R$)': CAVALO_REVISION_COSTS['REVISAO L'].totalCost },
      { Segmento: 'Cavalo Scania (CVM)', Revisão: 'REVISÃO M', 'Mão de Obra (R$)': CAVALO_REVISION_COSTS['REVISAO M'].laborCost, 'Total (R$)': CAVALO_REVISION_COSTS['REVISAO M'].totalCost },
      { Segmento: 'Cavalo Scania (CVM)', Revisão: 'REVISÃO S', 'Mão de Obra (R$)': CAVALO_REVISION_COSTS['REVISAO S'].laborCost, 'Total (R$)': CAVALO_REVISION_COSTS['REVISAO S'].totalCost },
      { Segmento: 'Cavalo Scania (CVM)', Revisão: 'REVISÃO X', 'Mão de Obra (R$)': CAVALO_REVISION_COSTS['REVISAO X'].laborCost, 'Total (R$)': CAVALO_REVISION_COSTS['REVISAO X'].totalCost },
      { Segmento: 'Thermo King (TKFrios)', Revisão: '1500H', 'Mão de Obra (R$)': TK_REVISION_COSTS['1500H'].laborCost, 'Total (R$)': TK_REVISION_COSTS['1500H'].totalCost },
      { Segmento: 'Thermo King (TKFrios)', Revisão: '2100H', 'Mão de Obra (R$)': TK_REVISION_COSTS['2100H'].laborCost, 'Total (R$)': TK_REVISION_COSTS['2100H'].totalCost },
      { Segmento: 'Carreta (Rodantes)', Revisão: '3 EIXOS', 'Mão de Obra (R$)': CARRETA_REVISION_COSTS['3 EIXOS'].laborCost, 'Total (R$)': CARRETA_REVISION_COSTS['3 EIXOS'].totalCost },
      { Segmento: 'Carreta (Rodantes)', Revisão: '2 EIXOS', 'Mão de Obra (R$)': CARRETA_REVISION_COSTS['2 EIXOS'].laborCost, 'Total (R$)': CARRETA_REVISION_COSTS['2 EIXOS'].totalCost },
    ];
    const ws3 = XLSX.utils.json_to_sheet(pricesRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Tabela Preços CVM e TKFrios');

    XLSX.writeFile(wb, `Previsao_Manutencao_Orcamento_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Exportar Previsão para PDF Executivo com Cards de Totais e Rodapé Completo
  const handleExportPdf = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const margin = 14;

    // Cabeçalho Principal Executivo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Relatório de Previsão Orçamentária e Cronograma de Manutenções', margin, 13);

    const activeFilterText = selectedMonthKey === 'all'
      ? `Todos os Meses (${filteredGroups.length} meses)`
      : filteredGroups[0]?.monthLabel || selectedMonthKey;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Filtro Ativo: ${activeFilterText} • Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Parâmetros: CVM Scania Cotrasa, TKFrios e Rodantes Carreta`,
      margin,
      18
    );

    // 4 Cards de Resumo Executivo (Exatamente como visualizado nos gráficos)
    const cardY = 22;
    const cardH = 19;
    const cardGap = 4;
    const usableWidth = pageWidth - (margin * 2);
    const cardW = (usableWidth - (cardGap * 3)) / 4;

    const cards = [
      {
        title: 'TOTAL ORÇADO PREVISTO',
        val: formatCurrencyPtBr(filteredTotals.total),
        sub: `${filteredTotals.totalVehicles} veículos programados`,
        color: [245, 158, 11], // Âmbar
        borderColor: [217, 119, 6],
      },
      {
        title: 'MÃO DE OBRA TOTAL',
        val: formatCurrencyPtBr(filteredTotals.totalLabor),
        sub: 'Serviços especializados autorizados',
        color: [16, 185, 129], // Emerald
        borderColor: [5, 150, 105],
      },
      {
        title: 'PEÇAS E INSUMOS',
        val: formatCurrencyPtBr(filteredTotals.totalParts),
        sub: 'Kits preventivos, filtros e lubrificantes',
        color: [14, 165, 233], // Sky blue
        borderColor: [2, 132, 199],
      },
      {
        title: 'FROTA PROGRAMADA',
        val: `${filteredTotals.totalVehicles} VEÍCULOS`,
        sub: `${filteredTotals.cavaloCount} Cavalos • ${filteredTotals.carretaCount} Carretas • ${filteredTotals.tkCount} TKs`,
        color: [255, 255, 255], // Branco
        borderColor: [99, 102, 241],
      },
    ];

    cards.forEach((c, i) => {
      const x = margin + i * (cardW + cardGap);
      // Fundo escuro do card
      doc.setFillColor(15, 23, 42);
      doc.setDrawColor(c.borderColor[0], c.borderColor[1], c.borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

      // Título do Card
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(148, 163, 184);
      doc.text(c.title, x + 3.5, cardY + 5);

      // Valor Principal em Destaque
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(c.color[0], c.color[1], c.color[2]);
      doc.text(c.val, x + 3.5, cardY + 11.5);

      // Subtítulo
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(c.sub, x + 3.5, cardY + 16);
    });

    const tableData: any[] = [];
    filteredGroups.forEach((g) => {
      g.items.forEach((item) => {
        tableData.push([
          g.monthLabel,
          item.plate,
          item.fleetNumber && item.fleetNumber !== item.plate ? item.fleetNumber : '-',
          item.type === 'cavalo' ? 'Cavalo' : item.type === 'carreta' ? 'Carreta' : 'Thermo King',
          item.revisionType,
          formatCurrencyPtBr(item.laborCost),
          formatCurrencyPtBr(item.partsCost),
          formatCurrencyPtBr(item.totalCost),
          item.explanation.slice(0, 50) + (item.explanation.length > 50 ? '...' : ''),
        ]);
      });
    });

    autoTable(doc, {
      head: [['Mês', 'Placa', 'Frota', 'Tipo', 'Revisão Prevista', 'Mão de Obra', 'Peças/Insumos', 'Total R$', 'Critério Operacional']],
      body: tableData,
      foot: [
        [
          {
            content: `TOTAL GERAL ORÇADO (${filteredTotals.totalVehicles} Veículos: ${filteredTotals.cavaloCount} Cavalos, ${filteredTotals.carretaCount} Carretas, ${filteredTotals.tkCount} TKs)`,
            colSpan: 5,
            styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 },
          },
          {
            content: formatCurrencyPtBr(filteredTotals.totalLabor),
            styles: { fontStyle: 'bold', textColor: [52, 211, 153], fontSize: 8 },
          },
          {
            content: formatCurrencyPtBr(filteredTotals.totalParts),
            styles: { fontStyle: 'bold', textColor: [56, 189, 248], fontSize: 8 },
          },
          {
            content: formatCurrencyPtBr(filteredTotals.total),
            styles: { fontStyle: 'bold', textColor: [251, 191, 36], fontSize: 9 },
          },
          {
            content: 'Total Orçado',
            styles: { fontStyle: 'bold', textColor: [203, 213, 225], fontSize: 7.5 },
          },
        ],
      ],
      startY: 46,
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      footStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data) => {
        const str = `Página ${data.pageNumber}`;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(str, pageWidth - margin - 15, pageHeight - 8);
        doc.text(
          'Sistema de Gestão de Frota Martin Brower • Relatório Executivo de Previsão Orçamentária de Manutenções',
          margin,
          pageHeight - 8
        );
      },
    });

    const filenameSuffix = selectedMonthKey !== 'all' ? `_${selectedMonthKey}` : '';
    doc.save(`Relatorio_Previsao_Manutencao${filenameSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Ações Compacto e Direto */}
      <div className="glass-panel border border-slate-700/60 rounded-xl p-3.5 sm:p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                Previsão Orçamentária
              </h2>
              <p className="text-[11px] text-slate-400">
                Cronograma de revisões, mão de obra e custos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {onOpenSyncDailySheet && (
              <button
                onClick={onOpenSyncDailySheet}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition cursor-pointer"
                title="Sincronizar planilha diária"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Sincronizar Planilha</span>
              </button>
            )}

            <button
              onClick={() => setShowPriceTable(!showPriceTable)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showPriceTable ? 'Ocultar Preços' : 'Preços'}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                showSettings
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Premissas</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition cursor-pointer"
              title="Exportar Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition cursor-pointer"
              title="Exportar PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Premissas operacionais expansíveis */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  Premissas de Rodagem e Horímetro Padrão
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  Configuração Operacional
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetPremissas}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Restaurar valores de referência oficial Martin Brower"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restaurar Padrões</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePremissas}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Premissas</span>
                </button>
              </div>
            </div>

            {premissasSavedSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center gap-2 text-xs text-emerald-300 font-semibold animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>✓ Premissas salvas com sucesso! As novas médias operacionais foram gravadas e aplicadas às projeções.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 space-y-1">
                <label className="block text-slate-300 font-semibold">
                  Média Rodagem Cavalo (KM / Mês):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="10"
                    min="100"
                    max="30000"
                    value={monthlyKmCavalo}
                    onChange={(e) => setMonthlyKmCavalo(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-amber-400 font-mono font-bold text-xs">KM</span>
                </div>
                <span className="text-[11px] text-slate-400 block pt-0.5">
                  Premissa Oficial: <strong className="text-amber-300">4.530 KM/mês</strong>
                </span>
              </div>

              <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 space-y-1">
                <label className="block text-slate-300 font-semibold">
                  Média Rodagem Carreta (KM / Mês):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="10"
                    min="100"
                    max="30000"
                    value={monthlyKmCarreta}
                    onChange={(e) => setMonthlyKmCarreta(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-amber-400 font-mono font-bold text-xs">KM</span>
                </div>
                <span className="text-[11px] text-slate-400 block pt-0.5">
                  Premissa Oficial: <strong className="text-amber-300">5.755 KM/mês</strong>
                </span>
              </div>

              <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 space-y-1">
                <label className="block text-slate-300 font-semibold">
                  Média Horímetro TK (Horas / Mês):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="1000"
                    value={monthlyHoursTk}
                    onChange={(e) => setMonthlyHoursTk(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-cyan-400 font-mono font-bold text-xs">Horas</span>
                </div>
                <span className="text-[11px] text-slate-400 block pt-0.5">
                  Premissa Oficial: <strong className="text-cyan-300">133 Horas/mês</strong>
                </span>
              </div>
            </div>

            {/* Rodapé com botão de ação para salvar premissas */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                💡 Ao clicar em <strong>Salvar Premissas</strong>, os valores de rodagem média e horímetro são gravados permanentemente no seu navegador e recalculam imediatamente todas as datas previstas das revisões.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetPremissas}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restaurar Padrões</span>
                </button>
                <button
                  type="button"
                  onClick={handleSavePremissas}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Premissas</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Preços Oficiais de Referência Solicitada pelo Usuário */}
      {showPriceTable && (
        <div className="glass-panel border border-slate-700/60 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Tabela Oficial de Preços de Manutenção (CVM Scania • TKFrios • Rodantes)
              </h3>
            </div>
            <span className="text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80">
              Valores Oficiais Fornecidos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. CAVALO - MÃO DE OBRA REVISÃO CVM / TOTAL */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> REVISÃO CAVALO (CVM SCANIA)
                </span>
                <span className="text-[10px] text-slate-400">MÃO OBRA / TOTAL</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onOpenRevisionCatalog?.('REVISAO L')}
                  className="w-full flex items-center justify-between p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-rose-500/50 transition cursor-pointer text-left"
                >
                  <div>
                    <span className="font-semibold text-rose-300 block">REVISÃO L (COMPLETA)</span>
                    <span className="text-[10px] text-slate-400">Trava 40k direta • Câmbio + Dif + Mot + 8 Filtros</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold block">
                      R$ 2.831,82 <span className="text-[10px] text-slate-400 font-normal">(M.O.)</span>
                    </span>
                    <span className="text-slate-300 text-[11px] font-mono">
                      Total: R$ 9.473,89
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRevisionCatalog?.('REVISAO M')}
                  className="w-full flex items-center justify-between p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-amber-500/50 transition cursor-pointer text-left"
                >
                  <div>
                    <span className="font-semibold text-amber-300 block">REVISÃO M</span>
                    <span className="text-[10px] text-slate-400">Trava 40k (+20k alerta X) • Óleo 41L + Elemento</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold block">
                      R$ 849,55 <span className="text-[10px] text-slate-400 font-normal">(M.O.)</span>
                    </span>
                    <span className="text-slate-300 text-[11px] font-mono">
                      Total: R$ 4.247,16
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRevisionCatalog?.('REVISAO S')}
                  className="w-full flex items-center justify-between p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-sky-500/50 transition cursor-pointer text-left"
                >
                  <div>
                    <span className="font-semibold text-sky-300 block">REVISÃO S</span>
                    <span className="text-[10px] text-slate-400">Trava 40k (+20k alerta X) • Óleo 41L + Kit Filtros</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold block">
                      R$ 707,96 <span className="text-[10px] text-slate-400 font-normal">(M.O.)</span>
                    </span>
                    <span className="text-slate-300 text-[11px] font-mono">
                      Total: R$ 3.449,87
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRevisionCatalog?.('REVISAO X')}
                  className="w-full flex items-center justify-between p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/50 transition cursor-pointer text-left"
                >
                  <div>
                    <span className="font-semibold text-indigo-300 block">REVISÃO X</span>
                    <span className="text-[10px] text-slate-400">Alerta 20k obrigatório • Kit de Filtros + Graxa</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold block">
                      R$ 283,18 <span className="text-[10px] text-slate-400 font-normal">(M.O.)</span>
                    </span>
                    <span className="text-slate-300 text-[11px] font-mono">
                      Total: R$ 1.134,97
                    </span>
                  </div>
                </button>
              </div>

              {onOpenRevisionCatalog && (
                <button
                  type="button"
                  onClick={() => onOpenRevisionCatalog('CICLO')}
                  className="w-full mt-1 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-600/40 text-[11px] font-bold text-center transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver O Que Cada Revisão Faz & Regra 40k / 20k</span>
                </button>
              )}
            </div>

            {/* 2. TK - VALORES TKFRIOS */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Snowflake className="w-3.5 h-3.5" /> REVISÃO TK (TKFRIOS)
                </span>
                <span className="text-[10px] text-slate-400">MÃO DE OBRA</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded bg-slate-900/80 border border-slate-800/80">
                  <div>
                    <span className="font-semibold text-cyan-300 block">REVISÃO TK 1.500H</span>
                    <span className="text-[11px] text-slate-400">Preventiva Mestre do Motor</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold text-sm block">
                      R$ 2.192,00
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Mão de Obra</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded bg-slate-900/80 border border-slate-800/80">
                  <div>
                    <span className="font-semibold text-teal-300 block">REVISÃO TK 2.100H</span>
                    <span className="text-[11px] text-slate-400">Ajustes & Calibrações</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold text-sm block">
                      R$ 240,00
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Mão de Obra</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. CARRETA - REVISÃO RODANTES */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Container className="w-3.5 h-3.5" /> REVISÃO CARRETA (RODANTES)
                </span>
                <span className="text-[10px] text-slate-400">MÃO DE OBRA</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded bg-slate-900/80 border border-slate-800/80">
                  <div>
                    <span className="font-semibold text-amber-300 block">RODANTES 3 EIXOS</span>
                    <span className="text-[11px] text-slate-400">Freios, Cubos e Mancais (Pesado)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold text-sm block">
                      R$ 1.073,00
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Mão de Obra</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded bg-slate-900/80 border border-slate-800/80">
                  <div>
                    <span className="font-semibold text-orange-300 block">RODANTES 2 EIXOS</span>
                    <span className="text-[11px] text-slate-400">Freios e Suspensão (Médio/Urbano)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold text-sm block">
                      R$ 878,50
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Mão de Obra</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Métricas e Resumo Executivo Compactos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="glass-card border border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-0.5">
            <span className="truncate">Total Orçado</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-400">
            {formatCurrencyPtBr(filteredTotals.total)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between font-mono tabular-nums">
            <span>M.O.: <strong className="text-slate-200">{formatCurrencyPtBr(filteredTotals.totalLabor)}</strong></span>
            <span>Peças: <strong className="text-slate-200">{formatCurrencyPtBr(filteredTotals.totalParts)}</strong></span>
          </div>
        </div>

        <div className="glass-card border border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-0.5">
            <span className="truncate">Média Mensal</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-sky-300">
            {formatCurrencyPtBr(
              filteredGroups.length > 0 ? filteredTotals.total / filteredGroups.length : 0
            )}
            <span className="text-[10px] text-slate-400 font-normal">/mês</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
            ~{Math.round(filteredTotals.totalVehicles / Math.max(1, filteredGroups.length))} revisões/mês
          </div>
        </div>

        <div className="glass-card border border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-0.5">
            <span className="truncate">Placas Programadas</span>
            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-white">
            {filteredTotals.totalVehicles}{' '}
            <span className="text-[10px] font-normal text-slate-400">paradas</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono truncate">
            <span className="text-sky-400">{filteredTotals.cavaloCount} Cav</span>
            <span>·</span>
            <span className="text-amber-400">{filteredTotals.carretaCount} Crt</span>
            <span>·</span>
            <span className="text-cyan-400">{filteredTotals.tkCount} TK</span>
          </div>
        </div>

        <div className="glass-card border border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-0.5">
            <span className="truncate">Pico Orçamentário</span>
            <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-300 truncate font-mono">
            {forecastData.maxMonthGroup ? forecastData.maxMonthGroup.monthLabel : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
            {forecastData.maxMonthGroup
              ? `${forecastData.maxMonthGroup.totalVehicles} veíc (${formatCurrencyPtBr(forecastData.maxMonthGroup.totalCost)})`
              : 'Sem dados'}
          </div>
        </div>
      </div>

      {/* Controles de Filtros e Busca */}
      <div className="glass-panel border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Categoria */}
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs flex-wrap gap-0.5">
            <button
              onClick={() => {
                setSelectedType('all');
                setFilterTk500hOnly(false);
                setFilterTk1500hOnly(false);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                selectedType === 'all' && !filterTk500hOnly && !filterTk1500hOnly
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({forecastData.totalVehiclesProjected})
            </button>
            <button
              onClick={() => {
                setSelectedType('cavalo');
                setFilterTk500hOnly(false);
                setFilterTk1500hOnly(false);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                selectedType === 'cavalo' && !filterTk500hOnly && !filterTk1500hOnly
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Cavalos
            </button>
            <button
              onClick={() => {
                setSelectedType('carreta');
                setFilterTk500hOnly(false);
                setFilterTk1500hOnly(false);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                selectedType === 'carreta' && !filterTk500hOnly && !filterTk1500hOnly
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Container className="w-3.5 h-3.5" />
              Carretas
            </button>
            <button
              onClick={() => {
                setSelectedType('tk');
                setFilterTk500hOnly(false);
                setFilterTk1500hOnly(false);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                selectedType === 'tk' && !filterTk500hOnly && !filterTk1500hOnly
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              TKs (Todos)
            </button>
            <button
              onClick={() => {
                setSelectedType('tk');
                setFilterTk500hOnly(false);
                setFilterTk1500hOnly(true);
              }}
              className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterTk1500hOnly
                  ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-black shadow-sm'
                  : 'text-cyan-300 hover:text-white bg-cyan-950/40 border border-cyan-800/60'
              }`}
              title="Filtrar exclusivamente as 31 placas de Thermo King com regra periódica de 1.500 horas"
            >
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>TKs 1.500h (31 TKs)</span>
            </button>
            <button
              onClick={() => {
                setSelectedType('tk');
                setFilterTk1500hOnly(false);
                setFilterTk500hOnly(true);
              }}
              className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterTk500hOnly
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-sm'
                  : 'text-cyan-300 hover:text-white bg-cyan-950/40 border border-cyan-800/60'
              }`}
              title="Filtrar exclusivamente as 7 placas oficiais com regra de 500h de troca de filtro"
            >
              <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filtro 500h (7 TKs)</span>
            </button>
          </div>

          {/* Filtro por Mês */}
          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">📅 Todos os Meses ({forecastData.groups.length} meses)</option>
            {forecastData.groups.map((g) => (
              <option key={g.monthKey} value={g.monthKey}>
                {g.monthLabel} ({g.totalVehicles} placas • {formatCurrencyPtBr(g.totalCost)})
              </option>
            ))}
          </select>

          {/* Alternador Cards / Tabela */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setForecastViewMode('cards')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                forecastViewMode === 'cards'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setForecastViewMode('table')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                forecastViewMode === 'table'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tabela
            </button>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar placa ou revisão..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      {/* Navegador Rápido de Meses (Timeline Chips) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {forecastData.groups.map((group) => {
          const isSelected = selectedMonthKey === group.monthKey;
          const isSpecialMonth = group.monthLabel === 'Janeiro/2027';

          return (
            <button
              key={group.monthKey}
              onClick={() => setSelectedMonthKey(isSelected ? 'all' : group.monthKey)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10'
                  : isSpecialMonth
                  ? 'bg-sky-950/40 border-sky-600/50 hover:border-sky-500 text-slate-200'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight">{group.monthLabel}</span>
                {isSpecialMonth && (
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1 py-0.2 rounded border border-sky-500/30">
                    Destaque
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] mt-1 font-mono">
                <span className="text-slate-400">{group.totalVehicles} placas</span>
                <span className="text-emerald-400 font-semibold">{formatCurrencyPtBr(group.totalCost)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lista / Grade dos Meses com as Placas Preveistas */}
      <div className="space-y-6">
        {filteredGroups.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-sm font-medium">Nenhuma manutenção encontrada para os filtros selecionados.</p>
            <p className="text-xs text-slate-500 mt-1">Tente ajustar o tipo de veículo ou a busca por placa.</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isJan27 = group.monthLabel === 'Janeiro/2027';
            const now = new Date();
            const currentMonthLabel = `${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][now.getMonth()]}/${now.getFullYear()}`;
            const isCurrentMonth = group.monthLabel === currentMonthLabel;

            return (
              <div
                key={group.monthKey}
                className={`glass-panel border rounded-2xl p-5 shadow-xl transition-all ${
                  isCurrentMonth
                    ? 'border-emerald-500/70 bg-gradient-to-b from-emerald-950/20 to-slate-900/90 ring-1 ring-emerald-500/30'
                    : isJan27
                    ? 'border-sky-500/70 bg-gradient-to-b from-sky-950/30 to-slate-900/80 ring-1 ring-sky-500/30'
                    : 'border-slate-700/60'
                }`}
              >
                {/* Header do Mês */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${
                      isCurrentMonth
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-amber-400'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {group.monthLabel}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {group.totalVehicles} {group.totalVehicles === 1 ? 'veículo programado' : 'veículos programados'}
                        </span>
                        {isCurrentMonth && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Mês Atual (Ativo)
                          </span>
                        )}
                        {isJan27 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-sky-400" />
                            Exemplo Janeiro/27
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.cavaloCount} Cavalos • {group.carretaCount} Carretas • {group.tkCount} Thermo Kings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mão de Obra</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        {formatCurrencyPtBr(group.totalLaborCost)}
                      </span>
                    </div>
                    <div className="h-7 w-px bg-slate-800" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Orçado</span>
                      <span className="text-base font-bold font-mono text-white">
                        {formatCurrencyPtBr(group.totalCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visualização em Tabela ou Cards Resumidos */}
                {forecastViewMode === 'table' ? (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Placa / Frota</th>
                            <th className="py-2.5 px-3">Tipo</th>
                            <th className="py-2.5 px-3">Revisão Prevista</th>
                            <th className="py-2.5 px-3">Meta Programada</th>
                            <th className="py-2.5 px-3">Mão de Obra</th>
                            <th className="py-2.5 px-3">Total Orçado</th>
                            <th className="py-2.5 px-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {group.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-white">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{item.plate}</span>
                                  {item.fleetNumber && (
                                    <span className="text-[11px] text-slate-400 font-normal">({item.fleetNumber})</span>
                                  )}
                                  {item.isRolledOver && (
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                      title={item.explanation}
                                    >
                                      Rolagem {item.rolledOverFromMonth}
                                    </span>
                                  )}
                                  {item.isAttentionOnly && (
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                                      title={item.explanation}
                                    >
                                      Atenção: Troca Filtro
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 capitalize text-slate-300">
                                <div className="flex items-center gap-1">
                                  <span>{item.type}</span>
                                  {item.type === 'tk' && (
                                    isTkFilter500hPlate(item.plate) ? (
                                      <span className="text-[9px] font-bold px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">500h</span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1 rounded bg-teal-950 text-teal-300 border border-teal-800">1.500h</span>
                                    )
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-amber-300">
                                {item.revisionType}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">
                                {item.projectedMeter.toLocaleString('pt-BR')} {item.meterUnit}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                                {formatCurrencyPtBr(item.laborCost)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-white">
                                {formatCurrencyPtBr(item.totalCost)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {onOpenRegisterMaintenance && (
                                    <button
                                      onClick={() => {
                                        const found = vehicles.find((v) => v.id === item.vehicleId);
                                        if (found) onOpenRegisterMaintenance(found);
                                      }}
                                      className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition cursor-pointer flex items-center gap-1 shadow-xs"
                                      title="Registrar realização desta revisão agora"
                                    >
                                      <Wrench className="w-3 h-3" />
                                      <span>Revisar</span>
                                    </button>
                                  )}
                                  {onSelectVehicle && (
                                    <button
                                      onClick={() => {
                                        const found = vehicles.find((v) => v.id === item.vehicleId);
                                        if (found) onSelectVehicle(found);
                                      }}
                                      className="px-2 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition cursor-pointer"
                                    >
                                      Ver Detalhes
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Grade de Cards Resumidos */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.items.map((item) => {
                      const isCavalo = item.type === 'cavalo';
                      const isCarreta = item.type === 'carreta';

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 hover:border-slate-700 transition flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            {/* Topo Direto da Placa */}
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`p-1 rounded text-xs ${
                                    isCavalo
                                      ? 'bg-sky-500/10 text-sky-400'
                                      : isCarreta
                                      ? 'bg-amber-500/10 text-amber-400'
                                      : 'bg-cyan-500/10 text-cyan-400'
                                  }`}
                                >
                                  {isCavalo ? (
                                    <Truck className="w-3.5 h-3.5" />
                                  ) : isCarreta ? (
                                    <Container className="w-3.5 h-3.5" />
                                  ) : (
                                    <Snowflake className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <span className="font-mono font-black text-sm text-white">
                                  {item.plate}
                                </span>
                                {item.fleetNumber && (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    ({item.fleetNumber})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-wrap">
                                {item.isRolledOver && (
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    title={item.explanation}
                                  >
                                    Rolagem {item.rolledOverFromMonth}
                                  </span>
                                )}
                                {item.isAttentionOnly && (
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                                    title={item.explanation}
                                  >
                                    Atenção Filtro
                                  </span>
                                )}
                                {item.type === 'tk' && (
                                  isTkFilter500hPlate(item.plate) ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                                      500h
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                                      1.500h
                                    </span>
                                  )
                                )}
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isCavalo
                                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                      : isCarreta
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                  }`}
                                >
                                  {item.serviceCategory}
                                </span>
                              </div>
                            </div>

                            {/* Revisão e Meta Programada */}
                            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs flex items-center justify-between">
                              <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                                {item.revisionType}
                              </span>
                              <span className="font-mono text-slate-300 text-[11px]">
                                Meta: {item.projectedMeter.toLocaleString('pt-BR')} {item.meterUnit}
                              </span>
                            </div>

                            {/* Explicação da Programação / Rollover */}
                            {item.explanation && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 italic px-1">
                                {item.explanation}
                              </p>
                            )}
                          </div>

                          {/* Bloco Financeiro e Ação */}
                          <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                M.O.: <strong className="text-emerald-400">{formatCurrencyPtBr(item.laborCost)}</strong>
                              </span>
                              <span className="text-xs font-mono font-bold text-white block">
                                Total: {formatCurrencyPtBr(item.totalCost)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {onOpenRegisterMaintenance && (
                                <button
                                  onClick={() => {
                                    const found = vehicles.find((v) => v.id === item.vehicleId);
                                    if (found) onOpenRegisterMaintenance(found);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                                  title="Registrar Revisão agora"
                                >
                                  <Wrench className="w-3 h-3" />
                                  <span>Revisar</span>
                                </button>
                              )}
                              {onSelectVehicle && (
                                <button
                                  onClick={() => {
                                    const found = vehicles.find((v) => v.id === item.vehicleId);
                                    if (found) onSelectVehicle(found);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1"
                                >
                                  <span>Ver</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

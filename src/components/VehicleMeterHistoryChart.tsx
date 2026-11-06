import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Vehicle, MaintenanceRecord } from '../types';
import { TrendingUp, Calendar, Gauge, Clock, Award, Target, Info } from 'lucide-react';

interface ChartPoint {
  date: Date;
  dateStr: string;
  meter: number;
  label: string;
  type: 'history' | 'current' | 'target';
  revisionType?: string;
  workshop?: string;
  cost?: number;
  notes?: string;
}

interface VehicleMeterHistoryChartProps {
  vehicle: Vehicle;
  history: MaintenanceRecord[];
}

export const VehicleMeterHistoryChart: React.FC<VehicleMeterHistoryChartProps> = ({
  vehicle,
  history,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(560);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    point: ChartPoint;
  } | null>(null);

  const isHours = vehicle.meterUnit === 'HORAS';
  const unitLabel = isHours ? 'Horas' : 'KM';

  // 1. Coleta e consolidação de todos os pontos cronológicos do veículo
  const chartPoints = useMemo<ChartPoint[]>(() => {
    const pointsMap = new Map<string, ChartPoint>();

    // A) Histórico oficial registrado deste veículo
    const matchingHistory = history.filter(
      (h) => (h.vehicleId === vehicle.id || h.plate === vehicle.plate) && h.date && h.meterReading > 0
    );

    matchingHistory.forEach((h) => {
      // Normaliza data (YYYY-MM-DD)
      const dStr = h.date.slice(0, 10);
      const parsedDate = new Date(`${dStr}T12:00:00`);
      if (isNaN(parsedDate.getTime())) return;

      const existing = pointsMap.get(dStr);
      // Se houver múltiplos registros no mesmo dia, mantemos o de maior medição
      if (!existing || h.meterReading >= existing.meter) {
        pointsMap.set(dStr, {
          date: parsedDate,
          dateStr: dStr,
          meter: h.meterReading,
          label: h.revisionType || 'Revisão',
          type: 'history',
          revisionType: h.revisionType,
          workshop: h.workshop,
          cost: h.cost,
          notes: h.notes,
        });
      }
    });

    // B) Ponto da Última Manutenção no cadastro do veículo (se ainda não incluso)
    if (vehicle.lastMaintenanceDate && vehicle.lastMaintenanceMeter > 0) {
      const dStr = vehicle.lastMaintenanceDate.slice(0, 10);
      if (!pointsMap.has(dStr)) {
        const parsedDate = new Date(`${dStr}T12:00:00`);
        if (!isNaN(parsedDate.getTime())) {
          pointsMap.set(dStr, {
            date: parsedDate,
            dateStr: dStr,
            meter: vehicle.lastMaintenanceMeter,
            label: vehicle.lastMaintenanceType || 'Última Revisão',
            type: 'history',
            revisionType: vehicle.lastMaintenanceType,
          });
        }
      }
    }

    // C) Ponto Atual do Odômetro / Horímetro
    const todayStr = (vehicle.updatedAt || new Date().toISOString()).slice(0, 10);
    const todayDate = new Date(`${todayStr}T12:00:00`);
    
    // Se o ponto de hoje já existe mas com medição menor, atualizamos
    const currentOnDate = pointsMap.get(todayStr);
    if (!currentOnDate || vehicle.currentMeter > currentOnDate.meter) {
      pointsMap.set(todayStr, {
        date: todayDate,
        dateStr: todayStr,
        meter: vehicle.currentMeter,
        label: 'Medição Atual',
        type: 'current',
      });
    }

    // D) Ordenar cronologicamente
    let sorted = Array.from(pointsMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Se o veículo tiver apenas 1 ponto no histórico (ex: cadastro inicial),
    // sintetizamos um ponto de baseline retroativo para viabilizar a visualização da linha de evolução
    if (sorted.length === 1) {
      const single = sorted[0];
      const baselineDate = new Date(single.date.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 dias antes
      const baselineMeter = Math.max(0, Math.round(single.meter * 0.92));
      sorted.unshift({
        date: baselineDate,
        dateStr: baselineDate.toISOString().slice(0, 10),
        meter: baselineMeter,
        label: 'Marco Inicial Estimado',
        type: 'history',
      });
    }

    // E) Ponto de Meta Futura (Próxima Revisão Programada)
    if (vehicle.nextRevisionMeter > vehicle.currentMeter) {
      let targetDate: Date;
      if (vehicle.nextRevisionDate) {
        targetDate = new Date(`${vehicle.nextRevisionDate.slice(0, 10)}T12:00:00`);
      } else {
        // Estima data futura baseada no ritmo médio ou projeção de 45 dias
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const daysDiff = Math.max(1, (last.date.getTime() - first.date.getTime()) / (1000 * 3600 * 24));
        const meterDiff = Math.max(1, last.meter - first.meter);
        const ratePerDay = meterDiff / daysDiff;
        const daysToNext = ratePerDay > 0 ? (vehicle.nextRevisionMeter - vehicle.currentMeter) / ratePerDay : 45;
        const safeDays = Math.min(180, Math.max(15, Math.round(daysToNext)));
        targetDate = new Date(last.date.getTime() + safeDays * 24 * 3600 * 1000);
      }

      sorted.push({
        date: targetDate,
        dateStr: targetDate.toISOString().slice(0, 10),
        meter: vehicle.nextRevisionMeter,
        label: `Meta: ${vehicle.nextRevisionType}`,
        type: 'target',
        revisionType: vehicle.nextRevisionType,
      });
    }

    return sorted;
  }, [vehicle, history]);

  // Monitora largura do container para responsividade
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Renderização do Gráfico D3
  useEffect(() => {
    if (!svgRef.current || chartPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerWidth;
    const height = 240;
    const margin = { top: 25, right: 30, bottom: 35, left: 65 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Definição das escalas
    const xMinDate = chartPoints[0]?.date || new Date();
    const xMaxDate = chartPoints[chartPoints.length - 1]?.date || new Date();
    const xExtent: [Date, Date] = [xMinDate, xMaxDate];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const meters = chartPoints.map((p) => p.meter);
    const yMin = meters.length > 0 ? Math.min(...meters) : 0;
    const yMax = meters.length > 0 ? Math.max(...meters) : 100;
    const yPadding = (yMax - yMin) * 0.12 || 50;
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
      .range([innerHeight, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradientes Defs
    const defs = svg.append('defs');

    // Gradiente da Área preenchida
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', `meter-gradient-${vehicle.id}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    const themeColor =
      vehicle.type === 'cavalo'
        ? '#38bdf8' // sky-400
        : vehicle.type === 'tk'
        ? '#22d3ee' // cyan-400
        : '#fbbf24'; // amber-400

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', themeColor)
      .attr('stop-opacity', 0.28);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', themeColor)
      .attr('stop-opacity', 0.0);

    // Linhas de Grade Horizontais (Grid)
    const yTicks = yScale.ticks(5);
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.4);

    // Linha de Referência da Meta (se houver target)
    const targetPoint = chartPoints.find((p) => p.type === 'target');
    if (targetPoint) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(targetPoint.meter))
        .attr('y2', yScale(targetPoint.meter))
        .attr('stroke', '#f59e0b')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.7);

      g.append('text')
        .attr('x', innerWidth)
        .attr('y', yScale(targetPoint.meter) - 5)
        .attr('text-anchor', 'end')
        .attr('fill', '#f59e0b')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .text(`Meta: ${targetPoint.meter.toLocaleString('pt-BR')} ${vehicle.meterUnit}`);
    }

    // Segmentos: Dados Reais (Histórico + Atual) vs Projeção Futura (Target)
    const realPoints = chartPoints.filter((p) => p.type !== 'target');
    const projectionPoints = chartPoints.filter((p) => p.type === 'current' || p.type === 'target');

    // Gerador de Área para dados reais
    if (realPoints.length >= 2) {
      const areaGenerator = d3
        .area<ChartPoint>()
        .x((d) => xScale(d.date))
        .y0(innerHeight)
        .y1((d) => yScale(d.meter))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(realPoints)
        .attr('fill', `url(#meter-gradient-${vehicle.id})`)
        .attr('d', areaGenerator);
    }

    // Gerador de Linha Real
    const lineGenerator = d3
      .line<ChartPoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.meter))
      .curve(d3.curveMonotoneX);

    if (realPoints.length >= 2) {
      g.append('path')
        .datum(realPoints)
        .attr('fill', 'none')
        .attr('stroke', themeColor)
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('d', lineGenerator);
    }

    // Gerador de Linha Projetada (Tracejada) até a Meta
    if (projectionPoints.length === 2) {
      g.append('path')
        .datum(projectionPoints)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('stroke-opacity', 0.85)
        .attr('d', lineGenerator);
    }

    // Eixo X (Datas formatadas)
    const xAxis = d3
      .axisBottom<Date>(xScale)
      .ticks(Math.max(3, Math.floor(innerWidth / 90)))
      .tickFormat((d) => {
        const date = d as Date;
        return d3.timeFormat('%d/%m/%y')(date);
      });

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#475569');
    xAxisGroup.selectAll('.tick line').attr('stroke', '#475569');
    xAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace');

    // Eixo Y (Medição formatada)
    const yAxis = d3
      .axisLeft<number>(yScale)
      .ticks(5)
      .tickFormat((d) => {
        const val = Number(d);
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
        return String(val);
      });

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').attr('stroke', '#475569');
    yAxisGroup.selectAll('.tick line').attr('stroke', '#475569');
    yAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace');

    // Marcadores de Pontos (Dots interativos)
    const dotsGroup = g.append('g').attr('class', 'dots');

    chartPoints.forEach((point) => {
      const cx = xScale(point.date);
      const cy = yScale(point.meter);

      const dotGroup = dotsGroup.append('g').attr('class', 'point-group');

      // Se for o ponto ATUAL, desenha anel de pulsação
      if (point.type === 'current') {
        dotGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 9)
          .attr('fill', themeColor)
          .attr('fill-opacity', 0.25)
          .attr('class', 'animate-ping');

        dotGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 6)
          .attr('fill', '#0284c7')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      } else if (point.type === 'target') {
        // Ponto de Meta Futura
        dotGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 5)
          .attr('fill', '#f59e0b')
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 2);
      } else {
        // Ponto de Histórico Real
        dotGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 4.5)
          .attr('fill', themeColor)
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 1.5);
      }

      // Zona invisível ampliada para facilitar hover no mobile e desktop
      dotGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 16)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mouseenter', () => {
          setActiveTooltip({
            x: cx + margin.left,
            y: cy + margin.top,
            point,
          });
        })
        .on('mouseleave', () => {
          setActiveTooltip(null);
        });
    });

    // Barra vertical de cursor hover
    const hoverLine = g
      .append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .style('opacity', 0);

    // Overlay de captura do mouse em toda a área interna
    const bisectDate = d3.bisector<ChartPoint, Date>((d) => d.date).left;

    svg
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .attr('cursor', 'crosshair')
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event, this);
        const dateAtMouse = xScale.invert(mx);
        const idx = bisectDate(chartPoints, dateAtMouse, 1);
        const p0 = chartPoints[idx - 1];
        const p1 = chartPoints[idx];
        let nearest = p0;
        if (p1 && dateAtMouse.getTime() - p0.date.getTime() > p1.date.getTime() - dateAtMouse.getTime()) {
          nearest = p1;
        }
        if (nearest) {
          const cx = xScale(nearest.date);
          const cy = yScale(nearest.meter);
          hoverLine
            .attr('x1', cx)
            .attr('x2', cx)
            .style('opacity', 0.6);

          setActiveTooltip({
            x: cx + margin.left,
            y: cy + margin.top,
            point: nearest,
          });
        }
      })
      .on('mouseleave', () => {
        hoverLine.style('opacity', 0);
        setActiveTooltip(null);
      });
  }, [chartPoints, containerWidth, vehicle]);

  // Cálculos de Resumo Operacional
  const firstPoint = chartPoints[0];
  const currentPoint = chartPoints.find((p) => p.type === 'current') || chartPoints[chartPoints.length - 1];
  const totalProgression = currentPoint && firstPoint ? Math.max(0, currentPoint.meter - firstPoint.meter) : 0;
  const daysTracked =
    currentPoint && firstPoint
      ? Math.max(1, Math.round((currentPoint.date.getTime() - firstPoint.date.getTime()) / (1000 * 3600 * 24)))
      : 1;
  const dailyAverage = totalProgression > 0 ? (totalProgression / daysTracked).toFixed(0) : '0';

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3 relative overflow-hidden">
      {/* Cabeçalho do Gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Evolução do {isHours ? 'Horímetro' : 'Odômetro'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono font-normal">
                D3.js
              </span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Trajetória acumulada e projeção para a próxima revisão
            </span>
          </div>
        </div>

        {/* Resumo Rápido em Chips */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-slate-300">
            <Award className="w-3 h-3 text-sky-400" />
            <span className="text-[10px] text-slate-400">Variação:</span>
            <strong className="font-mono text-emerald-400">+{totalProgression.toLocaleString('pt-BR')} {vehicle.meterUnit}</strong>
          </div>

          <div className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 hidden sm:flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-slate-400">Média diária:</span>
            <strong className="font-mono text-white">~{dailyAverage} {vehicle.meterUnit}/dia</strong>
          </div>
        </div>
      </div>

      {/* SVG Canvas do D3 */}
      <div ref={containerRef} className="w-full relative min-h-[240px]">
        <svg
          ref={svgRef}
          width={containerWidth}
          height={240}
          className="overflow-visible select-none"
        />

        {/* Tooltip Dinâmico Customizado */}
        {activeTooltip && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl shadow-xl backdrop-blur-md text-xs w-52 animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${activeTooltip.x}px`,
              top: `${activeTooltip.y}px`,
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1.5">
              <span className="font-mono text-[10px] text-slate-400">
                {activeTooltip.point.date.toLocaleDateString('pt-BR')}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  activeTooltip.point.type === 'current'
                    ? 'bg-sky-500/20 text-sky-300'
                    : activeTooltip.point.type === 'target'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {activeTooltip.point.type === 'current'
                  ? 'LEITURA ATUAL'
                  : activeTooltip.point.type === 'target'
                  ? 'META PROGRAMADA'
                  : 'REVISÃO CONCLUÍDA'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-400">Medição:</span>
                <span className="font-mono font-black text-sm text-white">
                  {activeTooltip.point.meter.toLocaleString('pt-BR')} {vehicle.meterUnit}
                </span>
              </div>

              {activeTooltip.point.revisionType && (
                <div className="text-[11px] text-amber-300 font-medium">
                  {activeTooltip.point.revisionType}
                </div>
              )}

              {activeTooltip.point.workshop && (
                <div className="text-[10px] text-slate-400 truncate">
                  📍 {activeTooltip.point.workshop}
                </div>
              )}

              {activeTooltip.point.cost && activeTooltip.point.cost > 0 && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold">
                  R$ {activeTooltip.point.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legenda Operacional */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Histórico Real</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-white"></span>
            <span className="text-white font-semibold">Medição Atual</span>
          </div>
          {chartPoints.some((p) => p.type === 'target') && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-amber-300">Próxima Revisão</span>
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-400 italic">
          Passe o mouse ou toque nos pontos para detalhes
        </div>
      </div>
    </div>
  );
};

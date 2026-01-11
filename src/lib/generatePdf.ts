import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Category {
  name: string;
  current_amount: number;
  previous_amount: number | null;
  status: string;
  explanation: string | null;
}

interface Analysis {
  id: string;
  building_name: string | null;
  period: string;
  unit: string | null;
  total_amount: number;
  previous_total: number | null;
  status: string;
  created_at: string;
  notes?: string | null;
}

interface InflationContext {
  currentPeriod: { period: string; value: number } | null;
  previousPeriod: { period: string; value: number } | null;
  monthlyChange: number | null;
}

interface CommunityContext {
  averageTotal: number | null;
  buildingsCount: number;
  userVsAverage: number | null;
  percentileRank?: number;
}

interface EvolutionData {
  period: string;
  total: number;
}

interface ComparisonData {
  period: string;
  userPercent: number;
  inflationPercent: number | null;
  buildingsPercent: number | null;
}

interface EvolutionStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  changePercent: number;
}

interface HistoricalDataPoint {
  period: string;
  total_amount: number;
}

interface CategoryComparison {
  name: string;
  leftAmount: number;
  rightAmount: number;
  diff: number;
  changePercent: number | null;
}

interface ComparisonAnalysis {
  leftAnalysis: {
    id: string;
    building_name: string | null;
    period: string;
    total_amount: number;
  };
  rightAnalysis: {
    id: string;
    building_name: string | null;
    period: string;
    total_amount: number;
  };
  categories: CategoryComparison[];
  totalDiff: number;
  totalChangePercent: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateChange = (current: number, previous: number | null) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
};

// Colors
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  primaryLight: [59, 130, 246] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  bgBlue: [240, 249, 255] as [number, number, number],
  bgAmber: [254, 243, 199] as [number, number, number],
  bgGreen: [240, 253, 244] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
};

// Helper to add page footer
const addPageFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `ExpensaCheck - Análisis Profesional de Expensas | Página ${pageNum} de ${totalPages}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );
};

// Draw a styled metric box
const drawMetricBox = (
  doc: jsPDF, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  label: string, 
  value: string, 
  subValue?: string,
  accent?: [number, number, number]
) => {
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  
  if (accent) {
    doc.setFillColor(...accent);
    doc.rect(x, y, 3, height, 'F');
  }
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + 8, y + 10);
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 8, y + 22);
  
  if (subValue) {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(subValue, x + 8, y + 30);
  }
};

// Draw a horizontal bar chart
const drawHorizontalBarChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  categories: Category[],
  maxCategories: number = 8
) => {
  const topCategories = [...categories]
    .sort((a, b) => b.current_amount - a.current_amount)
    .slice(0, maxCategories);
  
  const maxValue = Math.max(...topCategories.map(c => c.current_amount));
  const barHeight = 14;
  const gap = 4;
  
  topCategories.forEach((cat, index) => {
    const barY = y + index * (barHeight + gap);
    const barWidth = (cat.current_amount / maxValue) * (width - 60);
    const isAttention = cat.status === "attention";
    
    // Category name
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const truncatedName = cat.name.length > 15 ? cat.name.substring(0, 14) + "…" : cat.name;
    doc.text(truncatedName, x, barY + 10);
    
    // Bar background
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(x + 50, barY + 2, width - 60, barHeight - 4, 2, 2, 'F');
    
    // Bar fill
    doc.setFillColor(...(isAttention ? COLORS.warning : COLORS.primary));
    doc.roundedRect(x + 50, barY + 2, barWidth, barHeight - 4, 2, 2, 'F');
    
    // Value
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(cat.current_amount), x + 52 + barWidth + 2, barY + 9);
  });
  
  return topCategories.length * (barHeight + gap);
};

// Draw comparison bar chart (current vs previous)
const drawComparisonBarChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  categories: Category[],
  maxCategories: number = 6
): number => {
  const topCategories = [...categories]
    .filter(c => c.previous_amount !== null && c.previous_amount > 0)
    .sort((a, b) => b.current_amount - a.current_amount)
    .slice(0, maxCategories);

  if (topCategories.length === 0) return 0;

  const maxValue = Math.max(
    ...topCategories.map(c => Math.max(c.current_amount, c.previous_amount || 0))
  );
  const barHeight = 10;
  const categoryHeight = 28;
  const chartWidth = width - 80;

  topCategories.forEach((cat, index) => {
    const catY = y + index * categoryHeight;
    
    // Category name
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const truncatedName = cat.name.length > 12 ? cat.name.substring(0, 11) + "…" : cat.name;
    doc.text(truncatedName, x, catY + 8);
    
    // Previous bar (gray/muted)
    const prevWidth = ((cat.previous_amount || 0) / maxValue) * chartWidth;
    doc.setFillColor(200, 200, 210);
    doc.roundedRect(x + 45, catY + 2, prevWidth, barHeight, 1, 1, 'F');
    
    // Current bar (colored based on change)
    const currWidth = (cat.current_amount / maxValue) * chartWidth;
    const change = calculateChange(cat.current_amount, cat.previous_amount);
    const isUp = change && change > 0;
    doc.setFillColor(...(isUp ? COLORS.warning : COLORS.success));
    doc.roundedRect(x + 45, catY + 13, currWidth, barHeight, 1, 1, 'F');
    
    // Values
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(formatCurrency(cat.previous_amount || 0), x + 47 + Math.max(prevWidth, 25), catY + 9);
    
    doc.setTextColor(...(isUp ? COLORS.warning : COLORS.success));
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(cat.current_amount), x + 47 + Math.max(currWidth, 25), catY + 20);
    
    // Change percentage
    if (change !== null) {
      doc.setFontSize(7);
      doc.text(`${change > 0 ? "+" : ""}${change.toFixed(0)}%`, x + width - 15, catY + 14, { align: "right" });
    }
  });

  // Legend
  const legendY = y + topCategories.length * categoryHeight + 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  
  doc.setFillColor(200, 200, 210);
  doc.rect(x, legendY, 8, 5, 'F');
  doc.setTextColor(...COLORS.muted);
  doc.text("Mes anterior", x + 10, legendY + 4);
  
  doc.setFillColor(...COLORS.primary);
  doc.rect(x + 50, legendY, 8, 5, 'F');
  doc.text("Mes actual", x + 60, legendY + 4);

  return topCategories.length * categoryHeight + 15;
};

// Draw side-by-side comparison bar chart for comparing two periods
const drawSideBySideComparisonChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  categories: CategoryComparison[],
  leftLabel: string,
  rightLabel: string,
  maxCategories: number = 8
): number => {
  const topCategories = categories.slice(0, maxCategories);
  if (topCategories.length === 0) return 0;

  const maxValue = Math.max(
    ...topCategories.map(c => Math.max(c.leftAmount, c.rightAmount))
  );
  const barHeight = 8;
  const categoryHeight = 24;
  const chartWidth = width - 70;

  topCategories.forEach((cat, index) => {
    const catY = y + index * categoryHeight;
    
    // Category name
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const truncatedName = cat.name.length > 12 ? cat.name.substring(0, 11) + "…" : cat.name;
    doc.text(truncatedName, x, catY + 10);
    
    // Left bar (base - gray/secondary)
    const leftWidth = Math.max((cat.leftAmount / maxValue) * chartWidth, 2);
    doc.setFillColor(...COLORS.secondary);
    doc.roundedRect(x + 45, catY + 2, leftWidth, barHeight, 1, 1, 'F');
    
    // Right bar (compare - colored based on change)
    const rightWidth = Math.max((cat.rightAmount / maxValue) * chartWidth, 2);
    const isUp = cat.diff > 0;
    const isDown = cat.diff < 0;
    doc.setFillColor(...(isUp ? COLORS.warning : isDown ? COLORS.success : COLORS.primary));
    doc.roundedRect(x + 45, catY + 11, rightWidth, barHeight, 1, 1, 'F');
    
    // Change indicator
    if (cat.changePercent !== null) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(isUp ? COLORS.warning : isDown ? COLORS.success : COLORS.muted));
      const changeText = `${cat.changePercent > 0 ? "+" : ""}${cat.changePercent.toFixed(0)}%`;
      doc.text(changeText, x + width - 5, catY + 10, { align: "right" });
    }
  });

  // Legend
  const legendY = y + topCategories.length * categoryHeight + 3;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  
  doc.setFillColor(...COLORS.secondary);
  doc.rect(x, legendY, 8, 5, 'F');
  doc.setTextColor(...COLORS.muted);
  const shortLeftLabel = leftLabel.length > 25 ? leftLabel.substring(0, 24) + "..." : leftLabel;
  doc.text(shortLeftLabel, x + 10, legendY + 4);
  
  doc.setFillColor(...COLORS.primary);
  doc.rect(x + 85, legendY, 8, 5, 'F');
  const shortRightLabel = rightLabel.length > 25 ? rightLabel.substring(0, 24) + "..." : rightLabel;
  doc.text(shortRightLabel, x + 95, legendY + 4);

  return topCategories.length * categoryHeight + 15;
};

// Draw line/area chart for evolution data
const drawEvolutionChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { period: string; value: number; label?: string }[],
  showAverage: boolean = true
): number => {
  if (data.length < 2) return 0;

  const padding = 35;
  const chartX = x + padding;
  const chartY = y;
  const chartWidth = width - padding - 10;
  const chartHeight = height - 25;

  const values = data.map(d => d.value);
  const minValue = Math.min(...values) * 0.9;
  const maxValue = Math.max(...values) * 1.1;
  const range = maxValue - minValue;
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  // Draw chart background
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 2, 2, 'F');

  // Draw grid lines
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const gridY = chartY + (chartHeight / 4) * i;
    doc.line(chartX, gridY, chartX + chartWidth, gridY);
    
    // Y-axis labels
    const value = maxValue - (range / 4) * i;
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.muted);
    doc.text(formatCurrency(value), x, gridY + 2, { align: "left" });
  }

  // Draw average line if enabled
  if (showAverage) {
    const avgY = chartY + chartHeight - ((average - minValue) / range) * chartHeight;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(chartX, avgY, chartX + chartWidth, avgY);
    doc.setLineDashPattern([], 0);
    
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.primary);
    doc.text("Prom.", chartX + chartWidth + 2, avgY + 2);
  }

  // Draw data line and area
  const points: { x: number; y: number }[] = [];
  const stepX = chartWidth / (data.length - 1);
  
  data.forEach((d, i) => {
    const px = chartX + stepX * i;
    const py = chartY + chartHeight - ((d.value - minValue) / range) * chartHeight;
    points.push({ x: px, y: py });
  });

  // Draw area fill
  doc.setFillColor(59, 130, 246, 0.2);
  doc.setGState(doc.GState({ opacity: 0.3 }));
  let areaPath = `M ${points[0].x} ${chartY + chartHeight}`;
  points.forEach(p => {
    areaPath += ` L ${p.x} ${p.y}`;
  });
  areaPath += ` L ${points[points.length - 1].x} ${chartY + chartHeight} Z`;
  // Since jsPDF doesn't support path directly, we'll draw filled polygon
  const polygonPoints: number[][] = [
    [points[0].x, chartY + chartHeight],
    ...points.map(p => [p.x, p.y]),
    [points[points.length - 1].x, chartY + chartHeight]
  ];
  
  doc.setFillColor(200, 220, 255);
  // Draw as polygon approximation
  for (let i = 0; i < points.length - 1; i++) {
    doc.triangle(
      points[i].x, points[i].y,
      points[i + 1].x, points[i + 1].y,
      points[i].x, chartY + chartHeight,
      'F'
    );
    doc.triangle(
      points[i + 1].x, points[i + 1].y,
      points[i + 1].x, chartY + chartHeight,
      points[i].x, chartY + chartHeight,
      'F'
    );
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // Draw line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }

  // Draw points
  points.forEach((p, i) => {
    doc.setFillColor(...COLORS.white);
    doc.circle(p.x, p.y, 2.5, 'F');
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1);
    doc.circle(p.x, p.y, 2.5, 'S');
  });

  // Draw X-axis labels
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.muted);
  data.forEach((d, i) => {
    const labelX = chartX + stepX * i;
    const shortPeriod = d.period.length > 8 ? d.period.substring(0, 7) + "." : d.period;
    doc.text(shortPeriod, labelX, chartY + chartHeight + 8, { align: "center" });
  });

  return height;
};

// Draw comparison indicator
const drawComparisonIndicator = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  userValue: number,
  compareValue: number,
  compareLabel: string
) => {
  const diff = userValue - compareValue;
  const isPositive = diff > 0;
  
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(x, y, width, 35, 2, 2, 'F');
  
  // Label
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + 5, y + 10);
  
  // Comparison
  const diffText = `${isPositive ? "+" : ""}${diff.toFixed(1)}%`;
  const statusText = isPositive ? `más que ${compareLabel}` : `menos que ${compareLabel}`;
  
  doc.setTextColor(...(isPositive ? COLORS.warning : COLORS.success));
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(diffText, x + 5, y + 24);
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(statusText, x + 5, y + 31);
};

// Generate friendly critical analysis suggestions
const generateComparisonSuggestions = (
  comparison: ComparisonAnalysis
): string[] => {
  const suggestions: string[] = [];
  const { totalChangePercent, categories } = comparison;

  // Overall analysis
  if (totalChangePercent > 15) {
    suggestions.push("ALERTA: Se observa un incremento significativo en el total. Te recomendamos revisar las categorias con mayor variacion y consultar con la administracion sobre posibles gastos extraordinarios.");
  } else if (totalChangePercent > 5) {
    suggestions.push("NOTA: Hay un incremento moderado en tus expensas. Los aumentos pueden deberse a ajustes inflacionarios normales de servicios y sueldos.");
  } else if (totalChangePercent < -5) {
    suggestions.push("POSITIVO: Buenas noticias! Tus expensas disminuyeron. Esto puede indicar una gestion eficiente o la finalizacion de gastos extraordinarios.");
  } else {
    suggestions.push("ESTABLE: Tus expensas se mantienen estables entre ambos periodos, lo cual indica consistencia en los gastos del edificio.");
  }

  // Find top increases
  const bigIncreases = categories
    .filter(c => c.changePercent !== null && c.changePercent > 20)
    .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
    .slice(0, 3);

  if (bigIncreases.length > 0) {
    const catNames = bigIncreases.map(c => c.name).join(", ");
    suggestions.push(`ATENCION: Las categorias con mayor aumento son: ${catNames}. Verifica si corresponden a aumentos tarifarios o gastos puntuales.`);
  }

  // Find decreases
  const bigDecreases = categories
    .filter(c => c.changePercent !== null && c.changePercent < -15)
    .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
    .slice(0, 2);

  if (bigDecreases.length > 0) {
    const catNames = bigDecreases.map(c => c.name).join(", ");
    suggestions.push(`AHORRO: Bajaron significativamente: ${catNames}. Puede indicar renegociacion de contratos o reduccion de consumo.`);
  }

  // Actionable recommendations
  if (totalChangePercent > 10) {
    suggestions.push("SUGERENCIA: Solicita el detalle de gastos extraordinarios a la administracion y verifica que coincidan con las actas de consorcio.");
  }

  return suggestions;
};

export const generateAnalysisPdf = (
  analysis: Analysis, 
  categories: Category[],
  inflationContext?: InflationContext,
  communityContext?: CommunityContext,
  historicalData?: HistoricalDataPoint[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 0;

  // ========== PAGE 1: COVER & EXECUTIVE SUMMARY ==========
  
  // Header gradient effect
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 55, 'F');
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(0, 45, pageWidth, 15, 'F');
  
  // Logo and brand
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("ExpensaCheck", margin, 28);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Informe Completo de Analisis de Expensas", margin, 40);
  
  // Report metadata
  doc.setFontSize(9);
  doc.text(`Generado: ${formatDate(new Date().toISOString())}`, pageWidth - margin, 28, { align: "right" });
  doc.text(`ID: ${analysis.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, 38, { align: "right" });
  
  yPos = 70;
  
  // Building & Period info
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(analysis.period, margin, yPos);
  
  yPos += 8;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const buildingInfo = [analysis.building_name || "Edificio", analysis.unit].filter(Boolean).join(" - ");
  doc.text(buildingInfo, margin, yPos);
  
  yPos += 15;
  
  // ========== KEY METRICS ROW ==========
  const metricWidth = (pageWidth - margin * 2 - 10) / 3;
  const totalChange = calculateChange(analysis.total_amount, analysis.previous_total);
  const attentionItems = categories.filter(c => c.status === "attention").length;
  
  // Metric 1: Total actual
  drawMetricBox(
    doc, margin, yPos, metricWidth, 35,
    "Total del periodo",
    formatCurrency(analysis.total_amount),
    undefined,
    COLORS.primary
  );
  
  // Metric 2: Variación
  const changeColor = totalChange && totalChange > 0 ? COLORS.warning : COLORS.success;
  drawMetricBox(
    doc, margin + metricWidth + 5, yPos, metricWidth, 35,
    "Variacion vs anterior",
    totalChange ? `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)}%` : "N/A",
    analysis.previous_total ? `Anterior: ${formatCurrency(analysis.previous_total)}` : undefined,
    changeColor
  );
  
  // Metric 3: Estado
  const statusColor = attentionItems > 0 ? COLORS.warning : COLORS.success;
  drawMetricBox(
    doc, margin + (metricWidth + 5) * 2, yPos, metricWidth, 35,
    "Estado del analisis",
    attentionItems > 0 ? `${attentionItems} a revisar` : "Todo OK",
    `${categories.length} categorias analizadas`,
    statusColor
  );
  
  yPos += 50;
  
  // ========== EXECUTIVE SUMMARY ==========
  doc.setFillColor(...COLORS.bgBlue);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 45, 3, 3, 'F');
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, yPos, 4, 45, 'F');
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Ejecutivo", margin + 10, yPos + 12);
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Build executive summary text
  let summaryPoints: string[] = [];
  
  if (totalChange !== null) {
    const changeDesc = totalChange > 0 
      ? `Las expensas aumentaron un ${totalChange.toFixed(1)}% respecto al mes anterior.`
      : `Las expensas disminuyeron un ${Math.abs(totalChange).toFixed(1)}% respecto al mes anterior.`;
    summaryPoints.push(changeDesc);
  }
  
  if (attentionItems > 0) {
    const attentionCategories = categories.filter(c => c.status === "attention").map(c => c.name).slice(0, 3);
    summaryPoints.push(`${attentionItems} categoria(s) requieren atencion: ${attentionCategories.join(", ")}.`);
  } else {
    summaryPoints.push("Todas las categorias estan dentro de los rangos esperados.");
  }
  
  if (inflationContext?.monthlyChange !== null && totalChange !== null) {
    const vsInflation = totalChange - (inflationContext?.monthlyChange || 0);
    if (vsInflation > 2) {
      summaryPoints.push(`El aumento supera la inflacion del periodo por ${vsInflation.toFixed(1)} puntos.`);
    } else if (vsInflation < -2) {
      summaryPoints.push(`El aumento esta por debajo de la inflacion por ${Math.abs(vsInflation).toFixed(1)} puntos.`);
    }
  }
  
  const summaryText = summaryPoints.join(" ");
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2 - 20);
  doc.text(summaryLines, margin + 10, yPos + 22);
  
  yPos += 55;
  
  // ========== COMPARISON CHART: Current vs Previous ==========
  const categoriesWithPrevious = categories.filter(c => c.previous_amount !== null && c.previous_amount > 0);
  if (categoriesWithPrevious.length >= 2) {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Comparativa mes actual vs anterior", margin, yPos);
    yPos += 8;
    
    const chartHeight = drawComparisonBarChart(doc, margin, yPos, pageWidth - margin * 2, categories, 6);
    yPos += chartHeight + 5;
  }
  
  // ========== CONTEXT SECTION (Inflation & Community) ==========
  if (inflationContext || communityContext) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Contexto economico y comparativo", margin, yPos);
    yPos += 10;
    
    const contextWidth = (pageWidth - margin * 2 - 5) / 2;
    
    // Inflation comparison
    if (inflationContext && inflationContext.monthlyChange !== null && totalChange !== null) {
      drawComparisonIndicator(
        doc, margin, yPos, contextWidth,
        "Tu expensa vs inflacion del periodo",
        totalChange,
        inflationContext.monthlyChange,
        "inflacion"
      );
    }
    
    // Community comparison
    if (communityContext && communityContext.userVsAverage !== null) {
      drawComparisonIndicator(
        doc, margin + contextWidth + 5, yPos, contextWidth,
        "Tu expensa vs comunidad de edificios",
        communityContext.userVsAverage,
        0,
        `promedio (${communityContext.buildingsCount} edificios)`
      );
    }
    
    yPos += 45;
  }
  
  // ========== VISUAL CHART: Distribution ==========
  if (categories.length > 0) {
    if (yPos > 210) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Distribucion del gasto por categoria", margin, yPos);
    yPos += 8;
    
    const chartHeight = drawHorizontalBarChart(doc, margin, yPos, pageWidth - margin * 2, categories, 6);
    yPos += chartHeight + 10;
  }
  
  // ========== STATUS SUMMARY ==========
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFillColor(...(attentionItems > 0 ? COLORS.bgAmber : COLORS.bgGreen));
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'F');
  
  doc.setTextColor(...(attentionItems > 0 ? COLORS.warning : COLORS.success));
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  
  const statusMessage = attentionItems > 0 
    ? `ATENCION: Se detectaron ${attentionItems} categoria(s) con aumentos significativos que requieren revision`
    : `OK: Todas las categorias estan dentro de los rangos esperados - sin anomalias detectadas`;
  
  doc.text(statusMessage, margin + 5, yPos + 13);
  yPos += 30;
  
  // ========== PAGE 2: HISTORICAL EVOLUTION ==========
  if (historicalData && historicalData.length >= 2) {
    doc.addPage();
    yPos = 20;
    
    // Section header
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Evolucion historica del edificio", margin, yPos);
    yPos += 8;
    
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Basado en ${historicalData.length} analisis realizados`, margin, yPos);
    yPos += 15;
    
    // Calculate statistics
    const totals = historicalData.map(d => d.total_amount);
    const average = totals.reduce((a, b) => a + b, 0) / totals.length;
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const firstTotal = historicalData[0]?.total_amount || 0;
    const currentTotal = historicalData[historicalData.length - 1]?.total_amount || 0;
    const totalEvolution = firstTotal > 0 ? ((currentTotal - firstTotal) / firstTotal) * 100 : 0;
    
    // Stats boxes
    const statWidth = (pageWidth - margin * 2 - 15) / 4;
    
    // Average
    doc.setFillColor(...COLORS.bgLight);
    doc.roundedRect(margin, yPos, statWidth, 30, 2, 2, 'F');
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text("Promedio historico", margin + 5, yPos + 10);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(average), margin + 5, yPos + 22);
    
    // Min
    doc.setFillColor(...COLORS.bgGreen);
    doc.roundedRect(margin + statWidth + 5, yPos, statWidth, 30, 2, 2, 'F');
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Minimo registrado", margin + statWidth + 10, yPos + 10);
    doc.setTextColor(...COLORS.success);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(min), margin + statWidth + 10, yPos + 22);
    
    // Max
    doc.setFillColor(...COLORS.bgAmber);
    doc.roundedRect(margin + (statWidth + 5) * 2, yPos, statWidth, 30, 2, 2, 'F');
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Maximo registrado", margin + (statWidth + 5) * 2 + 5, yPos + 10);
    doc.setTextColor(...COLORS.warning);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(max), margin + (statWidth + 5) * 2 + 5, yPos + 22);
    
    // Evolution
    doc.setFillColor(...COLORS.bgBlue);
    doc.roundedRect(margin + (statWidth + 5) * 3, yPos, statWidth, 30, 2, 2, 'F');
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Evolucion total", margin + (statWidth + 5) * 3 + 5, yPos + 10);
    doc.setTextColor(...(totalEvolution > 0 ? COLORS.warning : COLORS.success));
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalEvolution > 0 ? "+" : ""}${totalEvolution.toFixed(1)}%`, margin + (statWidth + 5) * 3 + 5, yPos + 22);
    
    yPos += 45;
    
    // Draw evolution chart
    const chartData = historicalData.map(d => ({
      period: d.period,
      value: d.total_amount
    }));
    
    drawEvolutionChart(doc, margin, yPos, pageWidth - margin * 2, 80, chartData, true);
    yPos += 90;
    
    // Historical table
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle por periodo", margin, yPos);
    yPos += 8;
    
    const histTableData = historicalData.map((item, index) => {
      const prevItem = index > 0 ? historicalData[index - 1] : null;
      const change = prevItem ? ((item.total_amount - prevItem.total_amount) / prevItem.total_amount) * 100 : null;
      const diff = prevItem ? item.total_amount - prevItem.total_amount : null;
      return [
        item.period,
        formatCurrency(item.total_amount),
        diff !== null ? (diff > 0 ? "+" : "") + formatCurrency(diff) : "-",
        change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "-"
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [["Periodo", "Total", "Diferencia", "Variacion"]],
      body: histTableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: COLORS.bgLight,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: "right", cellWidth: 45 },
        2: { halign: "right", cellWidth: 40 },
        3: { halign: "right", cellWidth: 35 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const value = data.cell.raw as string;
          if (value.startsWith("+") && parseFloat(value) > 5) {
            data.cell.styles.textColor = COLORS.warning;
          } else if (value.startsWith("-")) {
            data.cell.styles.textColor = COLORS.success;
          }
        }
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // ========== PAGE 3: DETAILED BREAKDOWN ==========
  doc.addPage();
  yPos = 20;
  
  // Section header
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle completo por categoria", margin, yPos);
  yPos += 12;
  
  // Categories table
  const tableData = categories.map(cat => {
    const change = calculateChange(cat.current_amount, cat.previous_amount);
    const diff = cat.previous_amount ? cat.current_amount - cat.previous_amount : null;
    return [
      cat.name,
      formatCurrency(cat.current_amount),
      cat.previous_amount ? formatCurrency(cat.previous_amount) : "-",
      diff !== null ? (diff > 0 ? "+" : "") + formatCurrency(diff) : "-",
      change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "-",
      cat.status === "ok" ? "OK" : "Revisar"
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Categoria", "Actual", "Anterior", "Diferencia", "Variacion", "Estado"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: COLORS.bgLight,
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "center", cellWidth: 22 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const value = data.cell.raw as string;
        if (value.includes("Revisar")) {
          data.cell.styles.textColor = COLORS.warning;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = COLORS.success;
        }
      }
      if (data.section === "body" && data.column.index === 4) {
        const value = data.cell.raw as string;
        if (value.startsWith("+") && parseFloat(value) > 10) {
          data.cell.styles.textColor = COLORS.warning;
        }
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // ========== OBSERVATIONS & ALERTS ==========
  const itemsWithExplanation = categories.filter(c => c.explanation);
  
  if (itemsWithExplanation.length > 0) {
    finalY += 15;
    
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones detalladas", margin, finalY);
    finalY += 10;

    itemsWithExplanation.forEach(cat => {
      if (finalY > 250) {
        doc.addPage();
        finalY = 20;
      }

      const change = calculateChange(cat.current_amount, cat.previous_amount);
      const isAttention = cat.status === "attention";
      
      doc.setFillColor(...(isAttention ? COLORS.bgAmber : COLORS.bgBlue));
      doc.roundedRect(margin, finalY, pageWidth - margin * 2, 28, 2, 2, 'F');
      
      // Status indicator bar
      doc.setFillColor(...(isAttention ? COLORS.warning : COLORS.primary));
      doc.rect(margin, finalY, 3, 28, 'F');
      
      doc.setTextColor(...(isAttention ? COLORS.warning : COLORS.primary));
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(cat.name, margin + 8, finalY + 10);
      
      // Change info
      if (change !== null && cat.previous_amount) {
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${formatCurrency(cat.previous_amount)} → ${formatCurrency(cat.current_amount)} (${change > 0 ? "+" : ""}${change.toFixed(1)}%)`,
          pageWidth - margin - 5,
          finalY + 10,
          { align: "right" }
        );
      }
      
      doc.setTextColor(...COLORS.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const explanation = cat.explanation || "";
      const lines = doc.splitTextToSize(explanation, pageWidth - margin * 2 - 15);
      doc.text(lines, margin + 8, finalY + 20);
      
      finalY += 33 + (lines.length > 1 ? (lines.length - 1) * 4 : 0);
    });
  }

  // ========== NOTES SECTION ==========
  if (analysis.notes) {
    finalY += 10;
    
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Notas personales", margin, finalY);
    finalY += 8;
    
    doc.setFillColor(...COLORS.bgBlue);
    const noteLines = doc.splitTextToSize(analysis.notes, pageWidth - margin * 2 - 15);
    const noteHeight = Math.max(25, noteLines.length * 5 + 15);
    doc.roundedRect(margin, finalY, pageWidth - margin * 2, noteHeight, 2, 2, 'F');
    
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, finalY, 3, noteHeight, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(noteLines, margin + 8, finalY + 10);
    
    finalY += noteHeight + 5;
  }

  // ========== DISCLAIMER ==========
  finalY += 10;
  if (finalY > 260) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 25, 2, 2, 'F');
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const disclaimerText = "AVISO LEGAL: Este informe es orientativo y no reemplaza la verificacion manual de los documentos originales ni el asesoramiento profesional contable o legal. Los gastos marcados como 'a revisar' no necesariamente son incorrectos. ExpensaCheck no se responsabiliza por decisiones tomadas en base a este analisis.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2 - 10);
  doc.text(disclaimerLines, margin + 5, finalY + 8);

  // ========== ADD PAGE FOOTERS ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  // Save
  const fileName = `ExpensaCheck_Informe_${analysis.period.replace(/\s+/g, "_")}_${analysis.building_name?.replace(/\s+/g, "_") || "Edificio"}.pdf`;
  doc.save(fileName);
};

// ========== EVOLUTION PDF GENERATOR ==========
export const generateEvolutionPdf = (
  buildingName: string,
  evolutionData: EvolutionData[],
  comparisonData: ComparisonData[],
  stats: EvolutionStats,
  deviation?: { fromInflation: number; fromBuildings: number; isSignificant: boolean },
  aiAnalysis?: string | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 0;

  // ========== HEADER ==========
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ExpensaCheck", margin, 25);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Informe de Evolución de Expensas", margin, 38);
  
  doc.setFontSize(9);
  doc.text(`Generado: ${formatDate(new Date().toISOString())}`, pageWidth - margin, 25, { align: "right" });
  
  yPos = 65;
  
  // Building name
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(buildingName, margin, yPos);
  
  yPos += 8;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Análisis histórico de ${stats.count} períodos`, margin, yPos);
  
  yPos += 18;
  
  // ========== KEY METRICS ==========
  const metricWidth = (pageWidth - margin * 2 - 15) / 4;
  
  drawMetricBox(doc, margin, yPos, metricWidth, 35, "Períodos", String(stats.count), undefined, COLORS.primary);
  drawMetricBox(doc, margin + metricWidth + 5, yPos, metricWidth, 35, "Promedio", formatCurrency(stats.avg), undefined, COLORS.primary);
  
  const minMaxColors: [number, number, number] = COLORS.success;
  drawMetricBox(doc, margin + (metricWidth + 5) * 2, yPos, metricWidth, 35, "Mínimo", formatCurrency(stats.min), undefined, minMaxColors);
  
  const maxColor: [number, number, number] = COLORS.warning;
  drawMetricBox(doc, margin + (metricWidth + 5) * 3, yPos, metricWidth, 35, "Máximo", formatCurrency(stats.max), undefined, maxColor);
  
  yPos += 50;

  // ========== EVOLUTION CHART ==========
  if (evolutionData.length >= 2) {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Grafico de evolucion historica", margin, yPos);
    yPos += 8;
    
    const chartData = evolutionData.map(d => ({ period: d.period, value: d.total }));
    const chartHeight = drawEvolutionChart(doc, margin, yPos, pageWidth - margin * 2, 60, chartData, true);
    yPos += chartHeight + 10;
  }
  
  // ========== DEVIATION SUMMARY ==========
  if (deviation) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Comparativa de rendimiento", margin, yPos);
    yPos += 10;
    
    const halfWidth = (pageWidth - margin * 2 - 5) / 2;
    
    // Inflation comparison
    const inflationColor = deviation.fromInflation > 5 ? COLORS.warning : deviation.fromInflation < -5 ? COLORS.success : COLORS.primary;
    doc.setFillColor(...COLORS.bgLight);
    doc.roundedRect(margin, yPos, halfWidth, 40, 2, 2, 'F');
    doc.setFillColor(...inflationColor);
    doc.rect(margin, yPos, 3, 40, 'F');
    
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Tu evolución vs inflación", margin + 8, yPos + 10);
    
    doc.setTextColor(...inflationColor);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${deviation.fromInflation > 0 ? "+" : ""}${deviation.fromInflation.toFixed(1)}%`, margin + 8, yPos + 26);
    
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const inflationText = deviation.fromInflation > 0 ? "por encima de la inflación" : "por debajo de la inflación";
    doc.text(inflationText, margin + 8, yPos + 35);
    
    // Community comparison
    const communityColor = deviation.fromBuildings > 5 ? COLORS.warning : deviation.fromBuildings < -5 ? COLORS.success : COLORS.primary;
    doc.setFillColor(...COLORS.bgLight);
    doc.roundedRect(margin + halfWidth + 5, yPos, halfWidth, 40, 2, 2, 'F');
    doc.setFillColor(...communityColor);
    doc.rect(margin + halfWidth + 5, yPos, 3, 40, 'F');
    
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Tu evolución vs otros edificios", margin + halfWidth + 13, yPos + 10);
    
    doc.setTextColor(...communityColor);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${deviation.fromBuildings > 0 ? "+" : ""}${deviation.fromBuildings.toFixed(1)}%`, margin + halfWidth + 13, yPos + 26);
    
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const buildingsText = deviation.fromBuildings > 0 ? "por encima del promedio" : "por debajo del promedio";
    doc.text(buildingsText, margin + halfWidth + 13, yPos + 35);
    
    yPos += 50;
  }
  
  // ========== EVOLUTION TABLE ==========
  if (yPos > 180) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Evolucion historica detallada", margin, yPos);
  yPos += 10;
  
  // Prepare table data with comparison
  const tableData = evolutionData.map((item, index) => {
    const prevItem = index > 0 ? evolutionData[index - 1] : null;
    const change = prevItem ? calculateChange(item.total, prevItem.total) : null;
    const compData = comparisonData.find(c => c.period === item.period);
    
    return [
      item.period,
      formatCurrency(item.total),
      change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "-",
      compData?.inflationPercent !== null && compData?.inflationPercent !== undefined
        ? `${compData.inflationPercent > 0 ? "+" : ""}${compData.inflationPercent.toFixed(1)}%` 
        : "-",
      compData?.buildingsPercent !== null && compData?.buildingsPercent !== undefined
        ? `${compData.buildingsPercent > 0 ? "+" : ""}${compData.buildingsPercent.toFixed(1)}%` 
        : "-",
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Período", "Total", "Var. mensual", "Inflación acum.", "Edificios acum."]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: COLORS.bgLight,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: "right", cellWidth: 35 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 35 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && (data.column.index === 2 || data.column.index === 3 || data.column.index === 4)) {
        const value = data.cell.raw as string;
        if (value.startsWith("+")) {
          const numValue = parseFloat(value);
          if (numValue > 10) {
            data.cell.styles.textColor = COLORS.warning;
          }
        } else if (value.startsWith("-")) {
          data.cell.styles.textColor = COLORS.success;
        }
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // ========== AI ANALYSIS ==========
  if (aiAnalysis) {
    finalY += 15;
    
    if (finalY > 200) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Analisis inteligente", margin, finalY);
    finalY += 10;
    
    doc.setFillColor(...COLORS.bgBlue);
    const analysisLines = doc.splitTextToSize(aiAnalysis, pageWidth - margin * 2 - 15);
    const analysisHeight = Math.max(30, analysisLines.length * 5 + 15);
    doc.roundedRect(margin, finalY, pageWidth - margin * 2, analysisHeight, 2, 2, 'F');
    
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, finalY, 3, analysisHeight, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(analysisLines, margin + 8, finalY + 10);
    
    finalY += analysisHeight + 10;
  }
  
  // ========== KEY INSIGHTS ==========
  finalY += 5;
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen ejecutivo", margin, finalY);
  finalY += 10;
  
  const insights = [];
  
  // Trend insight
  if (stats.changePercent > 5) {
    insights.push(`TENDENCIA ALCISTA: El ultimo periodo subio ${stats.changePercent.toFixed(1)}% respecto al anterior.`);
  } else if (stats.changePercent < -5) {
    insights.push(`TENDENCIA BAJISTA: El ultimo periodo bajo ${Math.abs(stats.changePercent).toFixed(1)}% respecto al anterior.`);
  } else {
    insights.push(`ESTABLE: Variacion del ${Math.abs(stats.changePercent).toFixed(1)}% en el ultimo periodo.`);
  }
  
  // Range insight
  const range = stats.max - stats.min;
  const rangePercent = (range / stats.avg) * 100;
  insights.push(`RANGO: Variacion de ${formatCurrency(range)} (${rangePercent.toFixed(0)}% sobre el promedio).`);
  
  // Deviation insights
  if (deviation) {
    if (deviation.fromInflation > 10) {
      insights.push(`ALERTA: Tus expensas crecieron significativamente mas que la inflacion.`);
    } else if (deviation.fromInflation < -10) {
      insights.push(`POSITIVO: Tus expensas crecieron menos que la inflacion.`);
    }
    
    if (deviation.fromBuildings > 10) {
      insights.push(`ATENCION: Tus expensas evolucionaron por encima del promedio de edificios similares.`);
    } else if (deviation.fromBuildings < -10) {
      insights.push(`POSITIVO: Tus expensas evolucionaron por debajo del promedio de edificios similares.`);
    }
  }
  
  insights.forEach((insight, index) => {
    if (finalY > 270) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setFillColor(...COLORS.bgLight);
    doc.roundedRect(margin, finalY, pageWidth - margin * 2, 12, 2, 2, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(insight, margin + 5, finalY + 8);
    
    finalY += 15;
  });
  
  // ========== DISCLAIMER ==========
  finalY += 10;
  if (finalY > 260) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 20, 2, 2, 'F');
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const disclaimerText = "AVISO: Este informe es orientativo. Los datos de inflación e índices de edificios son aproximados. ExpensaCheck no se responsabiliza por decisiones basadas en este análisis.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2 - 10);
  doc.text(disclaimerLines, margin + 5, finalY + 8);

  // ========== PAGE FOOTERS ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  // Save
  const fileName = `ExpensaCheck_Evolucion_${buildingName.replace(/\s+/g, "_")}_${formatDate(new Date().toISOString()).replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};

// ========== COMPARISON PDF GENERATOR ==========
export const generateComparisonPdf = (
  comparison: ComparisonAnalysis,
  aiAnalysis?: string | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 0;

  const { leftAnalysis, rightAnalysis, categories, totalDiff, totalChangePercent } = comparison;

  // ========== HEADER ==========
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 55, 'F');
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(0, 45, pageWidth, 15, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ExpensaCheck", margin, 25);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Informe Comparativo de Expensas", margin, 40);
  
  doc.setFontSize(9);
  doc.text(`Generado: ${formatDate(new Date().toISOString())}`, pageWidth - margin, 28, { align: "right" });
  
  yPos = 70;
  
  // ========== COMPARISON HEADER ==========
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Comparación de períodos", margin, yPos);
  
  yPos += 15;
  
  // Side by side summary
  const halfWidth = (pageWidth - margin * 2 - 20) / 2;
  
  // Left period box
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(margin, yPos, halfWidth, 45, 3, 3, 'F');
  doc.setFillColor(...COLORS.secondary);
  doc.rect(margin, yPos, 4, 45, 'F');
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("PERÍODO BASE", margin + 10, yPos + 10);
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(leftAnalysis.period, margin + 10, yPos + 22);
  
  doc.setFontSize(16);
  doc.text(formatCurrency(leftAnalysis.total_amount), margin + 10, yPos + 38);
  
  // Arrow / difference indicator
  const centerX = pageWidth / 2;
  doc.setFillColor(...(totalDiff > 0 ? COLORS.warning : totalDiff < 0 ? COLORS.success : COLORS.primary));
  doc.circle(centerX, yPos + 22, 12, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const diffSymbol = totalDiff > 0 ? "↑" : totalDiff < 0 ? "↓" : "=";
  doc.text(diffSymbol, centerX, yPos + 20, { align: "center" });
  doc.setFontSize(6);
  doc.text(`${totalChangePercent > 0 ? "+" : ""}${totalChangePercent.toFixed(0)}%`, centerX, yPos + 28, { align: "center" });
  
  // Right period box
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(margin + halfWidth + 20, yPos, halfWidth, 45, 3, 3, 'F');
  doc.setFillColor(...(totalDiff > 0 ? COLORS.warning : totalDiff < 0 ? COLORS.success : COLORS.primary));
  doc.rect(margin + halfWidth + 20, yPos, 4, 45, 'F');
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("PERÍODO COMPARADO", margin + halfWidth + 30, yPos + 10);
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(rightAnalysis.period, margin + halfWidth + 30, yPos + 22);
  
  doc.setFontSize(16);
  doc.text(formatCurrency(rightAnalysis.total_amount), margin + halfWidth + 30, yPos + 38);
  
  yPos += 55;
  
  // ========== TOTAL DIFFERENCE SUMMARY ==========
  const isIncrease = totalDiff > 0;
  doc.setFillColor(...(isIncrease ? COLORS.bgAmber : COLORS.bgGreen));
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'F');
  
  doc.setTextColor(...(isIncrease ? COLORS.warning : COLORS.success));
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const summaryText = isIncrease 
    ? `AUMENTO: ${formatCurrency(totalDiff)} (+${totalChangePercent.toFixed(1)}%) entre ambos periodos`
    : totalDiff < 0 
      ? `REDUCCION: ${formatCurrency(Math.abs(totalDiff))} (${totalChangePercent.toFixed(1)}%) entre ambos periodos`
      : `ESTABLE: Sin cambios significativos entre ambos periodos`;
  doc.text(summaryText, margin + 8, yPos + 16);
  
  yPos += 35;
  
  // ========== COMPARISON CHART ==========
  if (categories.length > 0) {
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Comparacion visual por categoria", margin, yPos);
  yPos += 10;
    
    const chartHeight = drawSideBySideComparisonChart(
      doc, margin, yPos, pageWidth - margin * 2, 
      categories,
      leftAnalysis.period,
      rightAnalysis.period,
      8
    );
    yPos += chartHeight + 10;
  }
  
  // ========== DETAILED TABLE ==========
  if (yPos > 180) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle por categoria", margin, yPos);
  yPos += 10;
  
  const tableData = categories.map(cat => [
    cat.name,
    formatCurrency(cat.leftAmount),
    formatCurrency(cat.rightAmount),
    (cat.diff > 0 ? "+" : "") + formatCurrency(cat.diff),
    cat.changePercent !== null ? `${cat.changePercent > 0 ? "+" : ""}${cat.changePercent.toFixed(1)}%` : "-"
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Categoría", leftAnalysis.period, rightAnalysis.period, "Diferencia", "Variación"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: COLORS.bgLight,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: "right", cellWidth: 35 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 32 },
      4: { halign: "right", cellWidth: 28 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && (data.column.index === 3 || data.column.index === 4)) {
        const value = data.cell.raw as string;
        if (value.startsWith("+")) {
          const numValue = parseFloat(value.replace(/[^0-9.-]/g, ""));
          if (data.column.index === 4 && numValue > 15) {
            data.cell.styles.textColor = COLORS.warning;
            data.cell.styles.fontStyle = "bold";
          } else if (data.column.index === 3 && numValue > 0) {
            data.cell.styles.textColor = COLORS.warning;
          }
        } else if (value.startsWith("-")) {
          data.cell.styles.textColor = COLORS.success;
        }
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // ========== AI ANALYSIS / SUGGESTIONS ==========
  finalY += 15;
  
  if (finalY > 200) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Analisis y recomendaciones", margin, finalY);
  finalY += 10;
  
  // Generate suggestions
  const suggestions = aiAnalysis 
    ? [aiAnalysis] 
    : generateComparisonSuggestions(comparison);
  
  suggestions.forEach((suggestion, index) => {
    if (finalY > 260) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setFillColor(...COLORS.bgBlue);
    const lines = doc.splitTextToSize(suggestion, pageWidth - margin * 2 - 15);
    const boxHeight = Math.max(18, lines.length * 5 + 12);
    doc.roundedRect(margin, finalY, pageWidth - margin * 2, boxHeight, 2, 2, 'F');
    
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, finalY, 3, boxHeight, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(lines, margin + 8, finalY + 10);
    
    finalY += boxHeight + 5;
  });
  
  // ========== SIGNIFICANT CHANGES HIGHLIGHT ==========
  const significantChanges = categories.filter(c => c.changePercent !== null && Math.abs(c.changePercent) > 20);
  
  if (significantChanges.length > 0) {
    finalY += 10;
    
    if (finalY > 230) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Cambios significativos", margin, finalY);
    finalY += 10;
    
    significantChanges.slice(0, 5).forEach(cat => {
      if (finalY > 270) {
        doc.addPage();
        finalY = 20;
      }
      
      const isUp = cat.diff > 0;
      doc.setFillColor(...(isUp ? COLORS.bgAmber : COLORS.bgGreen));
      doc.roundedRect(margin, finalY, pageWidth - margin * 2, 18, 2, 2, 'F');
      
      doc.setFillColor(...(isUp ? COLORS.warning : COLORS.success));
      doc.rect(margin, finalY, 3, 18, 'F');
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(cat.name, margin + 8, finalY + 12);
      
      doc.setTextColor(...(isUp ? COLORS.warning : COLORS.success));
      doc.setFontSize(10);
      const changeText = `${cat.changePercent! > 0 ? "+" : ""}${cat.changePercent!.toFixed(1)}% (${cat.diff > 0 ? "+" : ""}${formatCurrency(cat.diff)})`;
      doc.text(changeText, pageWidth - margin - 5, finalY + 12, { align: "right" });
      
      finalY += 22;
    });
  }
  
  // ========== DISCLAIMER ==========
  finalY += 15;
  if (finalY > 260) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 25, 2, 2, 'F');
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const disclaimerText = "AVISO LEGAL: Este informe comparativo es orientativo. Las variaciones pueden deberse a factores estacionales, ajustes tarifarios o gastos extraordinarios legítimos. Recomendamos consultar las actas de consorcio para mayor detalle. ExpensaCheck no se responsabiliza por decisiones basadas en este análisis.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2 - 10);
  doc.text(disclaimerLines, margin + 5, finalY + 8);

  // ========== PAGE FOOTERS ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  // Save
  const leftPeriod = leftAnalysis.period.replace(/\s+/g, "_");
  const rightPeriod = rightAnalysis.period.replace(/\s+/g, "_");
  const building = leftAnalysis.building_name?.replace(/\s+/g, "_") || "Edificio";
  const fileName = `ExpensaCheck_Comparacion_${building}_${leftPeriod}_vs_${rightPeriod}.pdf`;
  doc.save(fileName);
};

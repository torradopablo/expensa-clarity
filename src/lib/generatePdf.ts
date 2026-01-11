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
  userVsAverage: number | null; // percentage difference
  percentileRank?: number; // where the user stands (e.g., top 30%)
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

export const generateAnalysisPdf = (
  analysis: Analysis, 
  categories: Category[],
  inflationContext?: InflationContext,
  communityContext?: CommunityContext
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 0;

  // ========== PAGE 1: COVER & SUMMARY ==========
  
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
  doc.text("Informe Profesional de Análisis de Expensas", margin, 40);
  
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
  const buildingInfo = [analysis.building_name || "Edificio", analysis.unit].filter(Boolean).join(" · ");
  doc.text(buildingInfo, margin, yPos);
  
  yPos += 15;
  
  // ========== KEY METRICS ROW ==========
  const metricWidth = (pageWidth - margin * 2 - 10) / 3;
  const totalChange = calculateChange(analysis.total_amount, analysis.previous_total);
  const attentionItems = categories.filter(c => c.status === "attention").length;
  
  // Metric 1: Total actual
  drawMetricBox(
    doc, margin, yPos, metricWidth, 35,
    "Total del período",
    formatCurrency(analysis.total_amount),
    undefined,
    COLORS.primary
  );
  
  // Metric 2: Variación
  const changeColor = totalChange && totalChange > 0 ? COLORS.warning : COLORS.success;
  drawMetricBox(
    doc, margin + metricWidth + 5, yPos, metricWidth, 35,
    "Variación vs anterior",
    totalChange ? `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)}%` : "N/A",
    analysis.previous_total ? `Anterior: ${formatCurrency(analysis.previous_total)}` : undefined,
    changeColor
  );
  
  // Metric 3: Estado
  const statusColor = attentionItems > 0 ? COLORS.warning : COLORS.success;
  drawMetricBox(
    doc, margin + (metricWidth + 5) * 2, yPos, metricWidth, 35,
    "Estado del análisis",
    attentionItems > 0 ? `${attentionItems} a revisar` : "Todo OK",
    `${categories.length} categorías analizadas`,
    statusColor
  );
  
  yPos += 50;
  
  // ========== CONTEXT SECTION (Inflation & Community) ==========
  if (inflationContext || communityContext) {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("📊 Contexto económico y comparativo", margin, yPos);
    yPos += 10;
    
    const contextWidth = (pageWidth - margin * 2 - 5) / 2;
    
    // Inflation comparison
    if (inflationContext && inflationContext.monthlyChange !== null && totalChange !== null) {
      drawComparisonIndicator(
        doc, margin, yPos, contextWidth,
        "Tu expensa vs inflación del período",
        totalChange,
        inflationContext.monthlyChange,
        "inflación"
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
  
  // ========== VISUAL CHART ==========
  const categoriesWithPrevious = categories.filter(c => c.previous_amount !== null);
  if (categoriesWithPrevious.length > 0) {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("📈 Distribución del gasto por categoría", margin, yPos);
    yPos += 8;
    
    const chartHeight = drawHorizontalBarChart(doc, margin, yPos, pageWidth - margin * 2, categories, 6);
    yPos += chartHeight + 10;
  }
  
  // ========== STATUS SUMMARY ==========
  doc.setFillColor(...(attentionItems > 0 ? COLORS.bgAmber : COLORS.bgGreen));
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'F');
  
  doc.setTextColor(...(attentionItems > 0 ? COLORS.warning : COLORS.success));
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  
  const statusIcon = attentionItems > 0 ? "⚠️" : "✅";
  const statusMessage = attentionItems > 0 
    ? `${statusIcon} Se detectaron ${attentionItems} categoría(s) con aumentos significativos que requieren revisión`
    : `${statusIcon} Todas las categorías están dentro de los rangos esperados - sin anomalías detectadas`;
  
  doc.text(statusMessage, margin + 5, yPos + 13);
  yPos += 30;
  
  // ========== PAGE 2: DETAILED BREAKDOWN ==========
  doc.addPage();
  yPos = 20;
  
  // Section header
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle completo por categoría", margin, yPos);
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
      cat.status === "ok" ? "✓ OK" : "⚠ Revisar"
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Categoría", "Actual", "Anterior", "Diferencia", "Variación", "Estado"]],
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
    doc.text("🔍 Observaciones detalladas", margin, finalY);
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
    doc.text("📝 Notas personales", margin, finalY);
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
  const disclaimerText = "AVISO LEGAL: Este informe es orientativo y no reemplaza la verificación manual de los documentos originales ni el asesoramiento profesional contable o legal. Los gastos marcados como 'a revisar' no necesariamente son incorrectos. ExpensaCheck no se responsabiliza por decisiones tomadas en base a este análisis.";
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
  
  // ========== DEVIATION SUMMARY ==========
  if (deviation) {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("📊 Comparativa de rendimiento", margin, yPos);
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
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("📈 Evolución histórica detallada", margin, yPos);
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
    doc.text("🤖 Análisis inteligente", margin, finalY);
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
  doc.text("💡 Resumen ejecutivo", margin, finalY);
  finalY += 10;
  
  const insights = [];
  
  // Trend insight
  if (stats.changePercent > 5) {
    insights.push(`📈 Tendencia alcista: El último período subió ${stats.changePercent.toFixed(1)}% respecto al anterior.`);
  } else if (stats.changePercent < -5) {
    insights.push(`📉 Tendencia bajista: El último período bajó ${Math.abs(stats.changePercent).toFixed(1)}% respecto al anterior.`);
  } else {
    insights.push(`➡️ Tendencia estable: Variación del ${Math.abs(stats.changePercent).toFixed(1)}% en el último período.`);
  }
  
  // Range insight
  const range = stats.max - stats.min;
  const rangePercent = (range / stats.avg) * 100;
  insights.push(`📊 Rango de variación: ${formatCurrency(range)} (${rangePercent.toFixed(0)}% sobre el promedio).`);
  
  // Deviation insights
  if (deviation) {
    if (deviation.fromInflation > 10) {
      insights.push(`⚠️ Alerta: Tus expensas crecieron significativamente más que la inflación.`);
    } else if (deviation.fromInflation < -10) {
      insights.push(`✅ Positivo: Tus expensas crecieron menos que la inflación.`);
    }
    
    if (deviation.fromBuildings > 10) {
      insights.push(`⚠️ Tus expensas evolucionaron por encima del promedio de edificios similares.`);
    } else if (deviation.fromBuildings < -10) {
      insights.push(`✅ Tus expensas evolucionaron por debajo del promedio de edificios similares.`);
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

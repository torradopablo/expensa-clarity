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

export const generateAnalysisPdf = (analysis: Analysis, categories: Category[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];
  const successColor: [number, number, number] = [34, 197, 94];
  const warningColor: [number, number, number] = [245, 158, 11];

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ExpensaCheck", margin, 25);

  // Tagline
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Análisis de expensas", margin, 35);

  // Report date
  doc.setFontSize(9);
  doc.text(`Generado el ${formatDate(new Date().toISOString())}`, pageWidth - margin, 35, { align: "right" });

  yPos = 65;

  // Building info section
  doc.setTextColor(...textColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(analysis.period, margin, yPos);
  
  yPos += 8;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const buildingInfo = [
    analysis.building_name || "Edificio",
    analysis.unit
  ].filter(Boolean).join(" · ");
  doc.text(buildingInfo, margin, yPos);

  // Total amount box
  yPos += 15;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 3, 3, 'F');

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total del período", margin + 10, yPos + 12);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(analysis.total_amount), margin + 10, yPos + 27);

  // Change percentage
  const totalChange = calculateChange(analysis.total_amount, analysis.previous_total);
  if (totalChange !== null && analysis.previous_total) {
    const changeText = `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)}% vs período anterior`;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...(totalChange > 10 ? warningColor : totalChange > 0 ? mutedColor : successColor));
    doc.text(changeText, pageWidth - margin - 10, yPos + 15, { align: "right" });
    
    // Show previous total
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.text(`Mes anterior: ${formatCurrency(analysis.previous_total)}`, pageWidth - margin - 10, yPos + 25, { align: "right" });
  }

  yPos += 50;

  // Status summary
  const attentionItems = categories.filter(c => c.status === "attention").length;
  const okItems = categories.filter(c => c.status === "ok").length;
  
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  
  if (attentionItems > 0) {
    doc.setTextColor(...warningColor);
    doc.text(`⚠ ${attentionItems} ${attentionItems === 1 ? "ítem requiere" : "ítems requieren"} revisión`, margin, yPos);
  } else {
    doc.setTextColor(...successColor);
    doc.text("✓ Todo en orden - Sin aumentos inusuales detectados", margin, yPos);
  }

  yPos += 8;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${okItems} categorías OK · ${attentionItems} categorías a revisar · ${categories.length} categorías analizadas`, margin, yPos);

  yPos += 15;

  // Evolution summary section
  if (analysis.previous_total) {
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de evolución", margin, yPos);
    yPos += 8;

    // Calculate evolution stats
    const difference = analysis.total_amount - analysis.previous_total;
    const increasedCategories = categories.filter(c => {
      if (!c.previous_amount) return false;
      return c.current_amount > c.previous_amount;
    });
    const decreasedCategories = categories.filter(c => {
      if (!c.previous_amount) return false;
      return c.current_amount < c.previous_amount;
    });
    const biggestIncrease = [...categories]
      .filter(c => c.previous_amount)
      .sort((a, b) => {
        const changeA = calculateChange(a.current_amount, a.previous_amount) || 0;
        const changeB = calculateChange(b.current_amount, b.previous_amount) || 0;
        return changeB - changeA;
      })[0];

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 28, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    // Column 1
    doc.setTextColor(...mutedColor);
    doc.text("Diferencia vs anterior:", margin + 5, yPos + 10);
    doc.setTextColor(...(difference > 0 ? warningColor : successColor));
    doc.setFont("helvetica", "bold");
    doc.text(`${difference > 0 ? "+" : ""}${formatCurrency(difference)}`, margin + 5, yPos + 20);

    // Column 2
    const col2X = margin + 60;
    doc.setTextColor(...mutedColor);
    doc.setFont("helvetica", "normal");
    doc.text("Categorías que aumentaron:", col2X, yPos + 10);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "bold");
    doc.text(`${increasedCategories.length} de ${categories.length}`, col2X, yPos + 20);

    // Column 3
    const col3X = margin + 120;
    doc.setTextColor(...mutedColor);
    doc.setFont("helvetica", "normal");
    doc.text("Mayor aumento:", col3X, yPos + 10);
    if (biggestIncrease) {
      const biggestChange = calculateChange(biggestIncrease.current_amount, biggestIncrease.previous_amount);
      doc.setTextColor(...(biggestChange && biggestChange > 10 ? warningColor : textColor));
      doc.setFont("helvetica", "bold");
      doc.text(`${biggestIncrease.name} (${biggestChange ? (biggestChange > 0 ? "+" : "") + biggestChange.toFixed(1) + "%" : "-"})`, col3X, yPos + 20);
    }

    yPos += 38;
  }

  // Categories table
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle por categoría", margin, yPos);

  yPos += 8;

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
    head: [["Categoría", "Actual", "Anterior", "Diferencia", "Variación", "Estado"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "center", cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const value = data.cell.raw as string;
        if (value === "Revisar") {
          data.cell.styles.textColor = warningColor;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = successColor;
        }
      }
      if (data.section === "body" && data.column.index === 4) {
        const value = data.cell.raw as string;
        if (value.startsWith("+") && parseFloat(value) > 10) {
          data.cell.styles.textColor = warningColor;
        }
      }
      if (data.section === "body" && data.column.index === 3) {
        const value = data.cell.raw as string;
        if (value.startsWith("+")) {
          data.cell.styles.textColor = warningColor;
        } else if (value.startsWith("-") || value.startsWith("−")) {
          data.cell.styles.textColor = successColor;
        }
      }
    },
  });

  // Get final Y position after table
  let finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

  // Explanations section
  const itemsWithExplanation = categories.filter(c => c.explanation && c.status === "attention");
  
  if (itemsWithExplanation.length > 0) {
    finalY += 15;
    
    // Check if we need a new page
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones y alertas", margin, finalY);
    
    finalY += 10;

    itemsWithExplanation.forEach(cat => {
      // Check if we need a new page
      if (finalY > 260) {
        doc.addPage();
        finalY = 20;
      }

      const change = calculateChange(cat.current_amount, cat.previous_amount);
      
      doc.setFillColor(254, 243, 199); // Amber-100
      doc.roundedRect(margin, finalY, pageWidth - (margin * 2), 25, 2, 2, 'F');
      
      doc.setTextColor(...warningColor);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${cat.name}`, margin + 5, finalY + 8);
      
      // Show change info
      if (change !== null && cat.previous_amount) {
        doc.setTextColor(...mutedColor);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${formatCurrency(cat.previous_amount)} → ${formatCurrency(cat.current_amount)} (${change > 0 ? "+" : ""}${change.toFixed(1)}%)`,
          pageWidth - margin - 5,
          finalY + 8,
          { align: "right" }
        );
      }
      
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const explanation = cat.explanation || "";
      const lines = doc.splitTextToSize(explanation, pageWidth - (margin * 2) - 10);
      doc.text(lines, margin + 5, finalY + 17);
      
      finalY += 30 + (lines.length > 1 ? (lines.length - 1) * 4 : 0);
    });
  }

  // Notes section
  if (analysis.notes) {
    finalY += 10;
    
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Notas personales", margin, finalY);
    
    finalY += 8;
    
    doc.setFillColor(240, 249, 255); // Light blue
    const noteLines = doc.splitTextToSize(analysis.notes, pageWidth - (margin * 2) - 10);
    const noteHeight = Math.max(20, noteLines.length * 5 + 10);
    doc.roundedRect(margin, finalY, pageWidth - (margin * 2), noteHeight, 2, 2, 'F');
    
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(noteLines, margin + 5, finalY + 8);
    
    finalY += noteHeight + 5;
  }

  // Disclaimer
  finalY += 10;
  if (finalY > 260) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, finalY, pageWidth - (margin * 2), 20, 2, 2, 'F');
  doc.setTextColor(...mutedColor);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const disclaimerText = "Este análisis es orientativo y no reemplaza la verificación manual de los documentos originales ni el asesoramiento profesional. Los gastos marcados como 'a revisar' no necesariamente son incorrectos.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - (margin * 2) - 10);
  doc.text(disclaimerLines, margin + 5, finalY + 8);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(
      `ExpensaCheck - Análisis de expensas | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `ExpensaCheck_${analysis.period.replace(/\s+/g, "_")}_${analysis.building_name?.replace(/\s+/g, "_") || "Edificio"}.pdf`;
  doc.save(fileName);
};

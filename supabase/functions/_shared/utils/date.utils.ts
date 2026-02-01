export const monthsEs: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

export function parseDate(period: string): Date {
  const parts = period.toLowerCase().split(" ");

  if (parts.length >= 2) {
    const month = monthsEs[parts[0]] ?? 0;
    const year = parseInt(parts[1]) || 2024;
    const date = new Date(year, month);
    return date;
  }

  return new Date();
}

/**
 * Convierte un período o fecha de período a formato YYYY-MM
 * Maneja tanto strings de fecha (YYYY-MM-DD) como períodos en español ("enero 2024")
 */
export function periodToYearMonth(period: string, periodDate?: string | null): string | null {
  // 1. Si tenemos periodDate, extraer directamente para evitar problemas de zona horaria
  if (periodDate) {
    const parts = periodDate.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }

  // 2. Si el período ya está en formato YYYY-MM
  if (/^\d{4}-\d{2}$/.test(period)) {
    return period;
  }

  // 3. Parsear formato español como "enero 2024"
  const parts = period.toLowerCase().trim().split(/\s+/);
  if (parts.length >= 2) {
    const month = monthsEs[parts[0]];
    if (month !== undefined) {
      const year = parseInt(parts[1]) || new Date().getFullYear();
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    }
  }

  return null;
}

export function buildPeriodDate(year?: number, month?: number): string | null {
  if (year && month) {
    return `${year}-${month.toString().padStart(2, '0')}-01`;
  }
  return null;
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

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

export function periodToYearMonth(period: string): string {
  // Check if period is already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(period)) {
    return period;
  }
  
  // Otherwise, parse Spanish format like "enero 2024"
  const date = parseDate(period);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

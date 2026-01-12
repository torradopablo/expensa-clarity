/**
 * Formatea una fecha en formato español argentino
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dateObj);
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Formatea un período (mes año)
 */
export function formatPeriod(period: string): string {
  // Si ya está en formato español, retornarlo
  if (/[a-záéíóúñ]+\s+\d{4}/i.test(period)) {
    return period;
  }
  
  // Si está en formato YYYY-MM, convertir a español
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-");
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  }
  
  return period;
}

/**
 * Obtiene el nombre del mes en español
 */
export function getMonthName(month: number): string {
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  return months[month];
}

/**
 * Convierte un período español a formato YYYY-MM
 */
export function periodToYearMonth(period: string): string {
  // Si ya está en formato YYYY-MM, retornarlo
  if (/^\d{4}-\d{2}$/.test(period)) {
    return period;
  }
  
  // Parsear formato español como "enero 2024"
  const monthsEs: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };
  
  const parts = period.toLowerCase().split(" ");
  if (parts.length >= 2) {
    const month = monthsEs[parts[0]] ?? 0;
    const year = parseInt(parts[1]) || 2024;
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }
  
  return period;
}

/**
 * Verifica si una fecha es relativamente reciente (últimos 30 días)
 */
export function isRecent(date: string | Date): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return dateObj >= thirtyDaysAgo;
}

/**
 * Obtiene cuántos días pasaron desde una fecha
 */
export function getDaysAgo(date: string | Date): number {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dateObj.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

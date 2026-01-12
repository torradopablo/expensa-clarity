/**
 * Formatea un número como moneda Argentina
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea un número como moneda Argentina con decimales
 */
export function formatCurrencyWithDecimals(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un número como porcentaje
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

/**
 * Calcula el porcentaje de cambio entre dos valores
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Formatea el cambio porcentual con signo y color
 */
export function formatChangePercent(current: number, previous: number): {
  value: string;
  isPositive: boolean;
  isNeutral: boolean;
} {
  const change = calculatePercentChange(current, previous);
  const isNeutral = Math.abs(change) < 0.1;
  const isPositive = change > 0;

  return {
    value: isNeutral ? "0%" : `${isPositive ? "+" : ""}${change.toFixed(1)}%`,
    isPositive,
    isNeutral,
  };
}

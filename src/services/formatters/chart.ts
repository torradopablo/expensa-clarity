import { formatCurrency } from "./currency";
export function prepareEvolutionChartData(data: Array<{
  period: string;
  userPercent?: number;
  inflationPercent?: number | null;
  buildingsPercent?: number | null;
}>) {
  return data.map(item => ({
    period: formatPeriod(item.period),
    usuario: item.userPercent || 0,
    inflación: item.inflationPercent !== null ? item.inflationPercent : undefined,
    promedio: item.buildingsPercent !== null ? item.buildingsPercent : undefined,
  }));
}

/**
 * Prepara datos para gráfico de categorías
 */
export function prepareCategoryChartData(categories: Array<{
  name: string;
  current_amount: number;
  previous_amount?: number | null;
}>) {
  return categories.map(category => ({
    name: category.name,
    actual: category.current_amount,
    anterior: category.previous_amount || 0,
    variacion: category.previous_amount 
      ? ((category.current_amount - category.previous_amount) / category.previous_amount) * 100 
      : 0,
  }));
}

/**
 * Configuración base para gráficos de líneas
 */
export const lineChartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      mode: "index" as const,
      intersect: false,
      callbacks: {
        label: function(context: any) {
          let label = context.dataset.label || "";
          if (label) {
            label += ": ";
          }
          label += `${context.parsed.y.toFixed(1)}%`;
          return label;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
      ticks: {
        font: {
          size: 11,
        },
        callback: function(value: any) {
          return `${value}%`;
        },
      },
    },
  },
  interaction: {
    mode: "nearest" as const,
    axis: "x" as const,
    intersect: false,
  },
};

/**
 * Configuración base para gráficos de barras
 */
export const barChartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          let label = context.dataset.label || "";
          if (label) {
            label += ": ";
          }
          label += formatCurrency(context.parsed.y);
          return label;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
      ticks: {
        font: {
          size: 11,
        },
        callback: function(value: any) {
          return formatCurrency(value);
        },
      },
    },
  },
};

/**
 * Colores para gráficos
 */
export const chartColors = {
  primary: "#10b981",      // green-600
  secondary: "#3b82f6",    // blue-600
  tertiary: "#f59e0b",     // amber-500
  quaternary: "#8b5cf6",   // violet-500
  gray: "#6b7280",         // gray-500
  light: "#f3f4f6",        // gray-100
  danger: "#ef4444",       // red-500
  warning: "#f59e0b",      // amber-500
  success: "#10b981",      // green-500
};

/**
 * Genera colores para datasets
 */
export function generateDatasetColors(count: number): string[] {
  const colors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.tertiary,
    chartColors.quaternary,
    chartColors.gray,
  ];
  
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

/**
 * Formatea el período para gráficos
 */
function formatPeriod(period: string): string {
  // Si ya está en formato español, retornarlo
  if (/[a-záéíóúñ]+\s+\d{4}/i.test(period)) {
    return period;
  }
  
  // Si está en formato YYYY-MM, convertir a español
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-");
    const months = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic"
    ];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
  }
  
  return period;
}

import { Chart as ChartJS } from 'chart.js';

// Las gráficas usan la tipografía y colores de la app en vez de Arial y grises por defecto
export function applyChartTheme() {
  ChartJS.defaults.font.family = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  ChartJS.defaults.font.size = 12;
  ChartJS.defaults.color = '#9aa3b5';
  ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
}

export const CHART_ACCENT = '#2dd4bf';
export const CHART_ACCENT_FILL = 'rgba(45, 212, 191, 0.12)';

import { Chart as ChartJS, Filler } from 'chart.js';

// Estética común de las gráficas: tipografía de la app, curvas suaves,
// trazos y puntos redondeados, relleno en degradado y tooltips redondeados.

export const CHART_COLORS = {
  // Los datos se dibujan en gris claro: el ámbar se reserva para lo accionable o en curso
  accent: '#b9bec5',
  pr: '#f4f6f7',
  surface: '#141518',
} as const;

let themed = false;

export function applyChartTheme() {
  if (themed) return;
  themed = true;

  // Sin Filler, `fill: true` no pinta nada
  ChartJS.register(Filler);

  const d = ChartJS.defaults;
  d.font.family = "'Barlow', system-ui, -apple-system, sans-serif";
  d.font.size = 12;
  d.color = '#8a9099';
  d.borderColor = 'rgba(255, 255, 255, 0.06)';

  // defaults.set crea la ruta aunque ese tipo de elemento aún no esté registrado
  d.set('elements.line', {
    tension: 0.45,
    cubicInterpolationMode: 'monotone',
    borderWidth: 3,
    borderCapStyle: 'round',
    borderJoinStyle: 'round',
  });

  d.set('elements.point', {
    radius: 4,
    hoverRadius: 7,
    hitRadius: 16,
    borderWidth: 2,
    hoverBorderWidth: 3,
  });

  d.set('plugins.tooltip', {
    backgroundColor: 'rgba(13, 17, 26, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    cornerRadius: 4,
    padding: { x: 12, y: 10 },
    caretSize: 6,
    displayColors: false,
    titleColor: '#f4f6fb',
    bodyColor: '#f4f6fb',
    titleFont: { weight: '600' },
    bodyFont: { weight: '700', size: 13 },
  });

  d.interaction.mode = 'index';
  d.interaction.intersect = false;
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Serie de línea redondeada con relleno plano muy sutil. */
export function roundedLineDataset(label: string, data: number[], color: string = CHART_COLORS.accent) {
  return {
    label,
    data,
    borderColor: color,
    pointBackgroundColor: CHART_COLORS.surface,
    pointBorderColor: color,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: CHART_COLORS.surface,
    fill: 'origin' as const,
    // Relleno plano y muy sutil: sin degradados
    backgroundColor: hexToRgba(color, 0.06),
  };
}

/** Opciones base para líneas y barras: rejilla horizontal discontinua, sin rejilla vertical ni leyenda redundante. */
export function roundedChartOptions(opts: { yTitle?: string; tooltipLabel: (value: number) => string }) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8 } },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: false, dash: [4, 6] },
        grid: { color: 'rgba(255, 255, 255, 0.07)', drawTicks: false },
        ticks: { padding: 10, maxTicksLimit: 5 },
        title: opts.yTitle ? { display: true, text: opts.yTitle } : { display: false },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { padding: 8, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => opts.tooltipLabel(context.raw),
        },
      },
    },
  };
}

/** Barras con extremos cuadrados y relleno plano (carga diaria: los días sin entreno no se dibujan). */
export function roundedBarDataset(label: string, data: number[], color: string = CHART_COLORS.accent) {
  return {
    label,
    data,
    borderRadius: 0,
    borderSkipped: false as const,
    maxBarThickness: 22,
    categoryPercentage: 0.9,
    barPercentage: 0.8,
    hoverBackgroundColor: color,
    backgroundColor: color,
  };
}

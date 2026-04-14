'use client'

import { Pie, Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js'

// Register all needed Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// ── Bold, distinct color palette ──────────────────────────────────
const CHART_COLORS = [
  '#22c55e', // green
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
  '#e11d48', // rose
  '#7c3aed', // violet
  '#0ea5e9', // sky
  '#d97706', // dark amber
  '#059669', // emerald
  '#dc2626', // dark red
]

// ── Chart Spec Types ──────────────────────────────────────────────

export interface ChartSpec {
  type: 'pie' | 'donut' | 'bar' | 'horizontal-bar' | 'line'
  title?: string
  data: Array<Record<string, any>>
  // For bar/line: key for x-axis labels
  xKey?: string
  // For bar/line: key for y-axis values
  yKey?: string
  // For pie/donut: key for segment names
  nameKey?: string
  // For pie/donut: key for segment values
  valueKey?: string
  // Optional custom colors
  colors?: string[]
}

// ── Parse a chart spec from raw string ────────────────────────────

export function parseChartSpec(raw: string): ChartSpec | null {
  try {
    const spec = JSON.parse(raw)
    if (!spec.type || !spec.data || !Array.isArray(spec.data)) return null
    const validTypes = ['pie', 'donut', 'bar', 'horizontal-bar', 'line']
    if (!validTypes.includes(spec.type)) return null
    return spec as ChartSpec
  } catch {
    return null
  }
}

// ── Pie / Donut Chart ─────────────────────────────────────────────

function PieChart({ spec }: { spec: ChartSpec }) {
  const nameKey = spec.nameKey || 'name'
  const valueKey = spec.valueKey || 'value'
  const colors = spec.colors || CHART_COLORS

  const chartData: ChartData<'pie'> = {
    labels: spec.data.map(d => String(d[nameKey])),
    datasets: [{
      data: spec.data.map(d => Number(d[valueKey]) || 0),
      backgroundColor: spec.data.map((_, i) => colors[i % colors.length]),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    }],
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !!spec.title,
        text: spec.title || '',
        font: { size: 13, weight: 'bold' },
        color: '#1f2937',
        padding: { bottom: 8 },
      },
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 8,
          font: { size: 11 },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'rectRounded',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
            return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`
          },
        },
      },
    },
  }

  // Donut = pie with cutout
  if (spec.type === 'donut') {
    (options as any).cutout = '55%'
  }

  return (
    <div className="w-full" style={{ height: spec.data.length <= 4 ? '180px' : '220px' }}>
      <Pie data={chartData} options={options} />
    </div>
  )
}

// ── Bar Chart (vertical or horizontal) ────────────────────────────

function BarChart({ spec }: { spec: ChartSpec }) {
  const isHorizontal = spec.type === 'horizontal-bar'
  const xKey = spec.xKey || 'name'
  const yKey = spec.yKey || 'value'
  const colors = spec.colors || CHART_COLORS

  const chartData: ChartData<'bar'> = {
    labels: spec.data.map(d => String(d[xKey])),
    datasets: [{
      label: spec.title || '',
      data: spec.data.map(d => Number(d[yKey]) || 0),
      backgroundColor: spec.data.map((_, i) => colors[i % colors.length]),
      borderColor: spec.data.map((_, i) => colors[i % colors.length]),
      borderWidth: 0,
      borderRadius: 4,
      barPercentage: 0.7,
      categoryPercentage: 0.85,
    }],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: isHorizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !!spec.title,
        text: spec.title || '',
        font: { size: 13, weight: 'bold' },
        color: '#1f2937',
        padding: { bottom: 8 },
      },
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed[isHorizontal ? 'x' : 'y']
            return ` ${(val ?? 0).toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: !isHorizontal, color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { size: 10 },
          color: '#6b7280',
          maxRotation: isHorizontal ? 0 : 45,
          callback: function (value) {
            if (!isHorizontal) {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value))
              if (numValue >= 1000000) return (numValue / 1000000).toFixed(1) + 'M'
              if (numValue >= 1000) return (numValue / 1000).toFixed(0) + 'K'
            }
            return this.getLabels()[value as number] || String(value)
          },
        },
        border: { display: false },
      },
      y: {
        grid: { display: isHorizontal, color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { size: isHorizontal ? 11 : 10, weight: isHorizontal ? ('bold' as const) : ('normal' as const) },
          color: '#374151',
          callback: function (value) {
            if (isHorizontal) {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value))
              if (numValue >= 1000000) return (numValue / 1000000).toFixed(1) + 'M'
              if (numValue >= 1000) return (numValue / 1000).toFixed(0) + 'K'
            }
            return this.getLabels()[value as number] || String(value)
          },
        },
        border: { display: false },
      },
    },
  }

  const height = isHorizontal
    ? `${Math.max(spec.data.length * 28 + 30, 120)}px`
    : spec.data.length > 6 ? '220px' : '180px'

  return (
    <div className="w-full" style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}

// ── Line Chart ────────────────────────────────────────────────────

function LineChart({ spec }: { spec: ChartSpec }) {
  const xKey = spec.xKey || 'name'
  const yKey = spec.yKey || 'value'

  const chartData: ChartData<'line'> = {
    labels: spec.data.map(d => String(d[xKey])),
    datasets: [{
      label: spec.title || '',
      data: spec.data.map(d => Number(d[yKey]) || 0),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 2.5,
      pointRadius: 4,
      pointBackgroundColor: '#22c55e',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: true,
    }],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !!spec.title,
        text: spec.title || '',
        font: { size: 13, weight: 'bold' },
        color: '#1f2937',
        padding: { bottom: 8 },
      },
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#6b7280' },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { size: 10 },
          color: '#6b7280',
          callback: function (value) {
            const numValue = typeof value === 'number' ? value : parseFloat(String(value))
            if (numValue >= 1000000) return (numValue / 1000000).toFixed(1) + 'M'
            if (numValue >= 1000) return (numValue / 1000).toFixed(0) + 'K'
            return String(value)
          },
        },
        border: { display: false },
      },
    },
  }

  return (
    <div className="w-full" style={{ height: '190px' }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// ── Main ChartRenderer ────────────────────────────────────────────

export default function ChartRenderer({ spec }: { spec: ChartSpec }) {
  try {
    switch (spec.type) {
      case 'pie':
      case 'donut':
        return <PieChart spec={spec} />
      case 'bar':
      case 'horizontal-bar':
        return <BarChart spec={spec} />
      case 'line':
        return <LineChart spec={spec} />
      default:
        return (
          <div className="text-xs text-gray-400 italic p-2 bg-gray-50 rounded">
            Unknown chart type: {spec.type}
          </div>
        )
    }
  } catch (err) {
    return (
      <div className="text-xs text-red-400 italic p-2 bg-red-50 rounded">
        Failed to render chart
      </div>
    )
  }
}

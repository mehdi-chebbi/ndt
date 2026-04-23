'use client'

import { useTranslation } from 'react-i18next'
import { resolveBilingualText } from '@/lib/i18n-utils'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js'
import 'chart.js/auto'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface StatsClass {
  class_name: string | { en: string; fr: string }
  area_km2: number
  percentage: number
}

interface StatsBarChartProps {
  classes: StatsClass[]
  totalArea: number
}

// Distinct color palette - completely different colors, not shades of the same color
const COLOR_PALETTE = [
  '#E63946', // Red
  '#F4A261', // Orange
  '#E9C46A', // Yellow/Gold
  '#2A9D8F', // Teal
  '#264653', // Dark Blue
  '#457B9D', // Medium Blue
  '#9B5DE5', // Purple
  '#F15BB5', // Pink
  '#00BBF9', // Bright Cyan
]

export default function StatsBarChart({ classes, totalArea }: StatsBarChartProps) {
  const { t } = useTranslation('map')

  // Sort classes by percentage (descending)
  const sortedClasses = [...classes].sort((a, b) => b.percentage - a.percentage)

  const chartData: ChartData<'bar'> = {
    labels: sortedClasses.map(c => resolveBilingualText(c.class_name)),
    datasets: [
      {
        label: t('statsTab.areaKm2'),
        data: sortedClasses.map(c => c.area_km2),
        backgroundColor: COLOR_PALETTE.slice(0, sortedClasses.length),
        borderColor: COLOR_PALETTE.slice(0, sortedClasses.length),
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y', // Horizontal bars
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    plugins: {
      legend: {
        display: false, // Hide legend, colors are self-explanatory
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            const index = context.dataIndex
            const classData = sortedClasses[index]
            return [
              t('chart.areaLabel', { area: classData.area_km2.toLocaleString(undefined, { maximumFractionDigits: 2 }) }),
              t('chart.percentageLabel', { percentage: classData.percentage }),
            ]
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          display: true,
          font: {
            size: 10,
          },
          callback: function (value) {
            // Show abbreviated numbers for large values
            const numValue = typeof value === 'number' ? value : parseFloat(value)
            if (numValue >= 1000000) {
              return (numValue / 1000000).toFixed(1) + 'M'
            }
            if (numValue >= 1000) {
              return (numValue / 1000).toFixed(0) + 'K'
            }
            return value.toString()
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          display: true,
          font: {
            size: 11,
            weight: 'bold' as any,
          },
          color: '#374151',
          autoSkip: false, // Show all labels
          maxRotation: 0,
          minRotation: 0,
        },
        border: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="w-full">
      <div style={{ height: `${sortedClasses.length * 25 + 10}px`, minHeight: '120px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}

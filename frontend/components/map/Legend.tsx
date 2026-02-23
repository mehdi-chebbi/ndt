'use client'

interface LegendItem {
  class: string
  color: string
}

interface LegendProps {
  legend: LegendItem[]
  layerName?: string
}

export default function Legend({ legend, layerName }: LegendProps) {
  if (!legend || legend.length === 0) return null

  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-40 max-w-xs">
      {layerName && (
        <h4 className="text-sm font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
          {layerName}
        </h4>
      )}
      <div className="space-y-1">
        {legend.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-700 truncate">{item.class}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

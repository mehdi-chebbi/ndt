'use client'

import { BasemapsTabProps } from './types'
import { basemapInfo } from './basemaps'

export default function BasemapsTab({ activeBasemap, onBasemapChange }: BasemapsTabProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {basemapInfo.map((basemap, index) => (
        <button
          key={basemap.name}
          data-tutorial={index === 0 ? 'basemap-first' : undefined}
          onClick={() => onBasemapChange(basemap.name)}
          className={`border-2 rounded-lg overflow-hidden transition hover:shadow-md ${
            activeBasemap === basemap.name
              ? 'border-gray-900'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="aspect-video bg-gray-100">
            <img
              src={basemap.thumbnail}
              alt={basemap.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-2 text-center">
            <span className="text-sm font-medium text-gray-900">{basemap.name}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

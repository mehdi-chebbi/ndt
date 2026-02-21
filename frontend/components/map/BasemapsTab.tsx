'use client'

import { BasemapsTabProps } from './types'
import { basemapNames } from './basemaps'

export default function BasemapsTab({ activeBasemap, onBasemapChange }: BasemapsTabProps) {
  return (
    <div className="space-y-3">
      {basemapNames.map((basemapName) => (
        <button
          key={basemapName}
          onClick={() => onBasemapChange(basemapName)}
          className={`w-full text-left px-4 py-3 rounded-lg transition ${
            activeBasemap === basemapName
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {basemapName}
        </button>
      ))}
    </div>
  )
}

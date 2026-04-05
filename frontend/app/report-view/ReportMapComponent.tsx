'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface ReportData {
  id: number
  original_layer: string
  invalid_area_polygon: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  comment: string
  reporter_name: string
  reporter_email: string
  status: 'invalid' | 'fixed'
  created_at: string
}

interface Layer {
  id: number
  name: string
  geoserver_name: string
  layerName: string
  wmsUrl: string
  bounds: [[number, number], [number, number]]
}

interface ReportMapComponentProps {
  report: ReportData
  layer: Layer | null
}

export default function ReportMapComponent({ report, layer }: ReportMapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialize map centered on Africa (will zoom to polygon later)
    const map = L.map(mapContainerRef.current, {
      center: [0, 20],
      zoom: 3,
      zoomControl: true,
    })

    // Add OSM basemap (fixed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      crossOrigin: true,
    }).addTo(map)

    // Add the report's layer if found
    if (layer) {
      L.tileLayer.wms(layer.wmsUrl, {
        layers: layer.layerName,
        format: 'image/png',
        transparent: true,
        attribution: `GeoServer - ${layer.name}`,
        bounds: layer.bounds,
      }).addTo(map)
    }

    // Draw the invalid area polygon
    if (report.invalid_area_polygon?.coordinates?.[0]) {
      const coordinates = report.invalid_area_polygon.coordinates[0]
      const latLngs: L.LatLng[] = coordinates.map(coord =>
        L.latLng(coord[1], coord[0])
      )

      const polygon = L.polygon(latLngs, {
        color: '#dc2626',
        fillColor: '#dc2626',
        fillOpacity: 0.3,
        weight: 3,
        dashArray: '10, 5',
      }).addTo(map)

      // Zoom to polygon
      map.fitBounds(polygon.getBounds(), {
        padding: [50, 50],
        maxZoom: 16,
      })
    }

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [report, layer])

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  )
}

/**
 * Converts GeoJSON Polygon or MultiPolygon geometries to WKT (Well-Known Text) format.
 * Used for passing polygon boundaries to GeoServer's clip parameter.
 */

export type GeoJSONGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

function ringToWkt(ring: number[][]): string {
  return ring.map(([lng, lat]) => `${lng} ${lat}`).join(',')
}

/**
 * Converts a GeoJSON Polygon or MultiPolygon to WKT format.
 * @param geometry - GeoJSON geometry object (Polygon or MultiPolygon)
 * @returns WKT string representation of the geometry
 * @throws Error if geometry type is not supported
 */
export function geojsonToWkt(geometry: GeoJSONGeometry): string {
  if (geometry.type === 'Polygon') {
    const rings = (geometry.coordinates as number[][][]).map(r => `(${ringToWkt(r)})`).join(',')
    return `POLYGON(${rings})`
  }

  if (geometry.type === 'MultiPolygon') {
    const polys = (geometry.coordinates as number[][][][])
      .map(poly => {
        const rings = poly.map(r => `(${ringToWkt(r)})`).join(',')
        return `(${rings})`
      })
      .join(',')
    return `MULTIPOLYGON(${polys})`
  }

  throw new Error(`Unsupported geometry type: ${geometry.type}`)
}

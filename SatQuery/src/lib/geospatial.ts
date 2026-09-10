// ─────────────────────────────────────────────────────────────────────────────
// SatQuery AI — Geospatial Utilities
// ─────────────────────────────────────────────────────────────────────────────

export interface BoundingBox {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export interface GeoMeta {
  crs?: string
  pixelResolutionM?: number
  boundingBox?: BoundingBox
  epsg?: number
}

// ─── Area Calculation ─────────────────────────────────────────────────────────

/** Haversine distance between two lat/lon points in meters */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dphi = ((lat2 - lat1) * Math.PI) / 180
  const dlambda = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Area of a polygon from lat/lon coordinate ring using shoelace + haversine */
export function polygonAreaHa(latLons: [number, number][]): number {
  if (latLons.length < 3) return 0
  // Approximate as flat using center latitude
  const centerLat = latLons.reduce((s, c) => s + c[0], 0) / latLons.length
  const metersPerDegLat = 111320
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180)

  let area = 0
  for (let i = 0, j = latLons.length - 1; i < latLons.length; j = i++) {
    const xi = latLons[i][1] * metersPerDegLon
    const yi = latLons[i][0] * metersPerDegLat
    const xj = latLons[j][1] * metersPerDegLon
    const yj = latLons[j][0] * metersPerDegLat
    area += xi * yj
    area -= xj * yi
  }
  const sqMeters = Math.abs(area) / 2
  return sqMeters / 10000 // to hectares
}

/** Bounding box area in hectares */
export function boundingBoxAreaHa(bbox: BoundingBox): number {
  const latDist = haversineDistance(bbox.minLat, bbox.minLon, bbox.maxLat, bbox.minLon)
  const lonDist = haversineDistance(bbox.minLat, bbox.minLon, bbox.minLat, bbox.maxLon)
  return (latDist * lonDist) / 10000
}

export function haToKm2(ha: number): number { return ha / 100 }
export function haToM2(ha: number): number { return ha * 10000 }

export function formatArea(ha: number): string {
  if (ha < 1) return `${Math.round(haToM2(ha)).toLocaleString()} m²`
  if (ha < 100) return `${ha.toFixed(2)} ha`
  return `${haToKm2(ha).toFixed(2)} km²`
}

// ─── Coordinate Display ───────────────────────────────────────────────────────

export function formatLatLon(lat: number, lon: number, decimals = 5): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(decimals)}°${ns}, ${Math.abs(lon).toFixed(decimals)}°${ew}`
}

// ─── CRS / EPSG ───────────────────────────────────────────────────────────────

const KNOWN_CRS: Record<number, string> = {
  4326: 'WGS 84 (Geographic)',
  32643: 'WGS 84 / UTM Zone 43N',
  32644: 'WGS 84 / UTM Zone 44N',
  32642: 'WGS 84 / UTM Zone 42N',
  32614: 'WGS 84 / UTM Zone 14N',
  3857: 'Web Mercator (Google/OSM)',
  4617: 'NAD83 (CSRS)',
}

export function describeCRS(epsg: number): string {
  return KNOWN_CRS[epsg] ? `EPSG:${epsg} — ${KNOWN_CRS[epsg]}` : `EPSG:${epsg}`
}

// ─── Demo GeoMeta ─────────────────────────────────────────────────────────────

export const DEMO_GEO_META: GeoMeta = {
  crs: 'WGS 84 / UTM Zone 43N',
  epsg: 32643,
  pixelResolutionM: 10,
  boundingBox: { minLat: 12.96, maxLat: 13.01, minLon: 77.58, maxLon: 77.65 },
}

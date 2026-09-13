import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, Marker, Polygon, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  Expand,
  LocateFixed,
  Search,
  Satellite,
  Map as MapIcon,
} from 'lucide-react'
import type { AnalysisResult, UploadedImage } from '../types'

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

type SatelliteMapProps = {
  detectedObjects: AnalysisResult['detected_objects']
  imageName: string
  geo?: Partial<UploadedImage>
  layerConfig?: {
    showSatellite: boolean
    showDetectedObjects: boolean
    showAOI: boolean
    showHeatmap: boolean
  }
  onToggleLayer?: (key: 'showSatellite' | 'showDetectedObjects' | 'showAOI' | 'showHeatmap') => void
  aoiPoints?: Array<[number, number]>
  onAoiChange?: (points: Array<[number, number]>) => void
  setQuery?: (query: string) => void
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  return null
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (location: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(event) {
      onLocationSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      })
    },
  })

  return null
}

function buildLocationQuery(lat: number, lng: number) {
  return `Analyze this location: latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)}.`
}

export function SatelliteMap({
  detectedObjects,
  imageName,
  geo,
  layerConfig,
  onToggleLayer,
  aoiPoints,
  setQuery,
}: SatelliteMapProps) {
  const [baseLayer, setBaseLayer] = useState<'satellite' | 'street'>('satellite')
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [search, setSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const center: [number, number] = [geo?.latitude ?? 20.5937, geo?.longitude ?? 78.9629]
  const zoom = geo?.zoom ?? 2
  const normalizedAoiPoints = aoiPoints ?? []

  const overlayPolygon: Array<[number, number]> = normalizedAoiPoints.length >= 3
    ? normalizedAoiPoints
    : detectedObjects.length
      ? [
          [center[0] - 0.9, center[1] - 1.6],
          [center[0] + 0.9, center[1] - 1.2],
          [center[0] + 1.1, center[1] + 1.6],
          [center[0] - 0.6, center[1] + 1.8],
        ]
      : []

  const aoiAreaKm2 = useMemo(() => {
    if (normalizedAoiPoints.length < 3) {
      return 0
    }

    if (normalizedAoiPoints.length < 3) {
      return 0
    }

    const radians = normalizedAoiPoints.map(([lat, lng]) => [lat * (Math.PI / 180), lng * (Math.PI / 180)] as const)

    let area = 0

    for (let index = 0; index < radians.length; index += 1) {
      const [lat1, lng1] = radians[index]
      const [lat2, lng2] = radians[(index + 1) % radians.length]
      area += lng1 * lat2 - lng2 * lat1
    }

    const absArea = Math.abs(area) / 2
    return absArea * 6371 * 6371
  }, [normalizedAoiPoints])

  const currentLocation = selectedLocation ?? { lat: center[0], lng: center[1] }

  const handleLocationSelection = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location)
    setSearchError('')
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported in this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setSelectedLocation(nextLocation)
        setSearchError('')
      },
      () => {
        setSearchError('Unable to access your location. Please allow location access.')
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const handleSearch = async () => {
    const trimmedSearch = search.trim()

    if (!trimmedSearch) {
      setSearchError('Please enter a location to search.')
      return
    }

    setIsSearching(true)
    setSearchError('')

    try {
      const encodedQuery = encodeURIComponent(trimmedSearch)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodedQuery}`,
      )

      const data = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>

      if (!data.length) {
        throw new Error('Location not found.')
      }

      const result = data[0]
      const nextLocation = {
        lat: Number(result.lat),
        lng: Number(result.lon),
      }

      setSelectedLocation(nextLocation)
      setSearch(result.display_name ?? trimmedSearch)
    } catch (error) {
      console.error(error)
      setSearchError('Unable to find that location. Please try a different place name.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAnalyzeThisLocation = () => {
    if (!selectedLocation) {
      return
    }

    const query = buildLocationQuery(selectedLocation.lat, selectedLocation.lng)
    setQuery?.(query)
  }

  const mapContainerClass = isExpanded
    ? 'fixed inset-3 z-50 overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/80 md:inset-10'
    : 'overflow-hidden rounded-2xl border border-slate-800 bg-slate-950'

  return (
    <div className={mapContainerClass}>
      <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBaseLayer('satellite')}
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] ${
                baseLayer === 'satellite'
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <Satellite className="h-3.5 w-3.5" />
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setBaseLayer('street')}
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] ${
                baseLayer === 'street'
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Street
            </button>
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-200"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Use My Location
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-200"
            >
              <Expand className="h-3.5 w-3.5" />
              {isExpanded ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSearch()
                  }
                }}
                placeholder="Search location"
                className="w-40 bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleLayer?.('showSatellite')}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
                layerConfig?.showSatellite ?? true
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => onToggleLayer?.('showDetectedObjects')}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
                layerConfig?.showDetectedObjects ?? true
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              Objects
            </button>
            <button
              type="button"
              onClick={() => onToggleLayer?.('showAOI')}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
                layerConfig?.showAOI ?? true
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              AOI
            </button>
            <button
              type="button"
              onClick={() => onToggleLayer?.('showHeatmap')}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
                layerConfig?.showHeatmap ?? true
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              Heatmap
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
              {geo?.regionName ?? 'Scene Overview'}
            </span>
            {normalizedAoiPoints.length >= 3 && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                AOI ~ {aoiAreaKm2.toFixed(2)} km²
              </span>
            )}
          </div>
        </div>

        {searchError && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {searchError}
          </div>
        )}
      </div>

      <div className={`relative ${isExpanded ? 'h-[calc(100vh-220px)]' : 'h-72 md:h-80'}`}>
        <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
          <MapController center={[currentLocation.lat, currentLocation.lng]} />
          <MapClickHandler onLocationSelect={handleLocationSelection} />

          {baseLayer === 'satellite' ? (
            <TileLayer
              attribution='Tiles &copy; Esri, OpenStreetMap contributors'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {(layerConfig?.showAOI ?? true) && overlayPolygon.length > 0 && (
            <Polygon
              positions={overlayPolygon}
              pathOptions={{ color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.17, weight: 1.5 }}
            />
          )}

          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={defaultIcon}>
              <Popup>
                <div className="text-sm text-slate-700">
                  <p className="font-semibold">Selected Location</p>
                  <p>Latitude: {selectedLocation.lat.toFixed(4)}</p>
                  <p>Longitude: {selectedLocation.lng.toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {(layerConfig?.showHeatmap ?? true) &&
            detectedObjects.slice(0, 5).map((object, index) => {
              const lat = center[0] + (index % 2 === 0 ? 0.55 : -0.35) + (index + 1) * 0.12
              const lng = center[1] + (index % 2 === 0 ? 0.65 : -0.45) + (index + 1) * 0.18
              const radius = Math.max(18000, Math.min(85000, object.confidence * 900))

              return (
                <Circle
                  key={`${object.id}-heatmap`}
                  center={[lat, lng]}
                  radius={radius}
                  pathOptions={{
                    color: '#67e8f9',
                    fillColor: '#67e8f9',
                    fillOpacity: 0.18,
                    weight: 1.5,
                  }}
                />
              )
            })}

          {(layerConfig?.showDetectedObjects ?? true) &&
            detectedObjects.slice(0, 5).map((object, index) => {
              const lat = center[0] + (index % 2 === 0 ? 0.55 : -0.35) + (index + 1) * 0.12
              const lng = center[1] + (index % 2 === 0 ? 0.65 : -0.45) + (index + 1) * 0.18

              return (
                <Marker key={`${object.id}-marker`} position={[lat, lng]} icon={defaultIcon}>
                  <Popup>
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold">{object.label}</p>
                      <p>{imageName}</p>
                      <p className="text-xs text-slate-500">Confidence: {object.confidence}%</p>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/95 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Selected Location</span>
          <span className="font-medium text-slate-100">
            Latitude: {currentLocation.lat.toFixed(4)}
          </span>
          <span className="font-medium text-slate-100">
            Longitude: {currentLocation.lng.toFixed(4)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAnalyzeThisLocation}
          disabled={!selectedLocation}
          className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyze This Location
        </button>
      </div>
    </div>
  )
}

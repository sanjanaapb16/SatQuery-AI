import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type SatelliteMapProps = { heatmap: boolean; opacity: number }

export default function SatelliteMap({ heatmap, opacity }: SatelliteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const overlayRef = useRef<L.Polygon | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true }).setView([12.978, 77.59], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map)
    L.marker([12.978, 77.59]).addTo(map).bindPopup('SatQuery analysis center').openPopup()
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    overlayRef.current?.remove()
    if (heatmap) {
      overlayRef.current = L.polygon([[12.984, 77.602], [12.984, 77.614], [12.975, 77.618], [12.971, 77.605]], { color: '#e56551', fillColor: '#e56551', fillOpacity: opacity / 240, weight: 2 }).addTo(mapRef.current)
      overlayRef.current.bindTooltip('New structures · 4.18 ha')
    }
  }, [heatmap, opacity])

  return <div ref={containerRef} className="satellite-map real-map" aria-label="Interactive OpenStreetMap analysis map" />
}

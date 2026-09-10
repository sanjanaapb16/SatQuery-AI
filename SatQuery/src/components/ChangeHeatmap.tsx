import { useEffect, useRef, useState } from 'react'

interface ChangeHeatmapProps {
  opacity: number
  enabled: boolean
}

export default function ChangeHeatmap({ opacity, enabled }: ChangeHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!enabled) return

    // Generate pseudo-random change heatmap based on fixed seed
    const seeds = [
      { x: 0.68, y: 0.32, r: 0.22, intensity: 0.95 },  // High change
      { x: 0.42, y: 0.65, r: 0.14, intensity: 0.7 },   // Medium
      { x: 0.18, y: 0.44, r: 0.09, intensity: 0.45 },  // Low
      { x: 0.78, y: 0.72, r: 0.11, intensity: 0.8 },   // High
      { x: 0.55, y: 0.20, r: 0.07, intensity: 0.55 },  // Medium
    ]

    const w = canvas.width
    const h = canvas.height

    seeds.forEach(({ x, y, r, intensity }) => {
      const cx = x * w
      const cy = y * h
      const radius = r * Math.min(w, h)

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      if (intensity > 0.8) {
        grad.addColorStop(0, `rgba(255, 60, 60, ${intensity})`)
        grad.addColorStop(0.4, `rgba(255, 140, 0, ${intensity * 0.7})`)
        grad.addColorStop(0.7, `rgba(255, 200, 0, ${intensity * 0.4})`)
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      } else if (intensity > 0.55) {
        grad.addColorStop(0, `rgba(255, 154, 97, ${intensity})`)
        grad.addColorStop(0.5, `rgba(229, 187, 97, ${intensity * 0.6})`)
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      } else {
        grad.addColorStop(0, `rgba(199, 239, 103, ${intensity})`)
        grad.addColorStop(0.5, `rgba(126, 226, 208, ${intensity * 0.5})`)
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      }

      ctx.beginPath()
      ctx.fillStyle = grad
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    setRendered(true)
  }, [enabled])

  if (!enabled) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={350}
        style={{
          width: '100%',
          height: '100%',
          opacity: opacity / 100,
          mixBlendMode: 'screen',
          transition: 'opacity 0.3s',
        }}
      />
      {rendered && (
        <div style={{
          position: 'absolute', bottom: '8px', right: '8px',
          background: 'rgba(16, 22, 25, 0.85)',
          border: '1px solid #2a373b',
          borderRadius: '3px',
          padding: '6px 9px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '9px',
          fontFamily: "'DM Mono'",
        }}>
          {[
            { label: 'Low', color: '#c7ef67' },
            { label: 'Medium', color: '#ff9a61' },
            { label: 'High', color: '#ff3c3c' },
          ].map(({ label, color }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#879598' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useCallback } from 'react'

interface ComparisonSliderProps {
  /** CSS background or image URL for the "before" layer */
  beforeLabel?: string
  /** CSS background or image URL for the "after" layer */
  afterLabel?: string
  beforeSrc?: string
  afterSrc?: string
  height?: number
}

export default function ComparisonSlider({
  beforeLabel = 'BEFORE',
  afterLabel = 'AFTER',
  beforeSrc,
  afterSrc,
  height = 300,
}: ComparisonSliderProps) {
  const [sliderX, setSliderX] = useState(50) // percent
  const [mode, setMode] = useState<'slider' | 'side-by-side' | 'flicker'>('slider')
  const [flicker, setFlicker] = useState(false)
  const [flickerState, setFlickerState] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    setSliderX(Math.max(2, Math.min(98, x)))
  }, [])

  const onMouseDown = () => { dragging.current = true }
  const onMouseMove = (e: React.MouseEvent) => { if (dragging.current) updateSlider(e.clientX) }
  const onMouseUp = () => { dragging.current = false }

  const beforeBg = beforeSrc ? `url(${beforeSrc}) center/cover` : 'linear-gradient(135deg, #1d3a45 0%, #293e48 100%)'
  const afterBg = afterSrc ? `url(${afterSrc}) center/cover` : 'linear-gradient(135deg, #2a3e28 0%, #1e3230 100%)'

  const startFlicker = () => {
    if (flicker) { setFlicker(false); return }
    setFlicker(true)
    let count = 0
    const interval = setInterval(() => {
      setFlickerState((p) => !p)
      count++
      if (count > 20) clearInterval(interval)
    }, 350)
  }

  return (
    <div style={{ border: '1px solid #2a373b', borderRadius: '4px', overflow: 'hidden', background: '#172126' }}>
      {/* Mode selector */}
      <div style={{ display: 'flex', gap: '6px', padding: '10px 12px', borderBottom: '1px solid #2a373b' }}>
        <span style={{ color: '#8a9a9d', font: "9px 'DM Mono'", letterSpacing: '1px', marginRight: '6px', paddingTop: '4px' }}>VIEW</span>
        {(['slider', 'side-by-side', 'flicker'] as const).map((m) => (
          <button
            key={m}
            onClick={m === 'flicker' ? startFlicker : () => setMode(m)}
            style={{
              padding: '4px 10px',
              fontSize: '10px',
              border: '1px solid',
              borderColor: mode === m ? '#4f7044' : '#2a373b',
              background: mode === m ? '#263726' : 'transparent',
              color: mode === m ? '#c7ef67' : '#8a9a9d',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {m === 'side-by-side' ? 'Side-by-Side' : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Comparison view */}
      {mode === 'side-by-side' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height }}>
          {[
            { label: beforeLabel, bg: beforeBg },
            { label: afterLabel, bg: afterBg },
          ].map(({ label, bg }) => (
            <div key={label} style={{ position: 'relative', background: bg }}>
              <span style={{
                position: 'absolute', top: '10px', left: '10px',
                background: 'rgba(0,0,0,0.7)', color: '#c7ef67',
                font: "9px 'DM Mono'", padding: '3px 7px', borderRadius: '2px',
              }}>{label}</span>
              {!beforeSrc && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#4e6065', fontSize: '11px',
                }}>
                  Upload image to preview
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Slider / Flicker */
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ position: 'relative', height, cursor: mode === 'slider' ? 'col-resize' : 'default', userSelect: 'none' }}
        >
          {/* After (full width) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: mode === 'flicker' && flickerState ? beforeBg : afterBg,
          }}>
            <span style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(0,0,0,0.7)', color: '#c7ef67',
              font: "9px 'DM Mono'", padding: '3px 7px', borderRadius: '2px',
            }}>{mode === 'flicker' && flickerState ? beforeLabel : afterLabel}</span>
          </div>

          {/* Before (clipped) — only in slider mode */}
          {mode === 'slider' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: beforeBg,
              clipPath: `inset(0 ${100 - sliderX}% 0 0)`,
            }}>
              <span style={{
                position: 'absolute', top: '10px', left: '10px',
                background: 'rgba(0,0,0,0.7)', color: '#7ee2d0',
                font: "9px 'DM Mono'", padding: '3px 7px', borderRadius: '2px',
              }}>{beforeLabel}</span>
            </div>
          )}

          {/* Slider handle */}
          {mode === 'slider' && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${sliderX}%`, transform: 'translateX(-50%)',
              width: '2px', background: '#c7ef67',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#c7ef67', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#101619', fontSize: '14px',
                boxShadow: '0 0 12px #c7ef6780',
              }}>⇔</div>
            </div>
          )}

          {/* No image fallback */}
          {!beforeSrc && mode === 'slider' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', color: '#4e6065', fontSize: '11px',
            }}>
              Upload before &amp; after images to use comparison view
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #2a373b', color: '#657477', fontSize: '10px' }}>
        {mode === 'slider' ? 'Drag the slider to compare images' : mode === 'side-by-side' ? 'Synchronized view' : 'Flicker comparison active'}
      </div>
    </div>
  )
}

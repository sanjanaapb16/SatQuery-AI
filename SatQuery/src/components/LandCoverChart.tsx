import type { LandCoverItem } from '../types'

interface LandCoverChartProps {
  items: LandCoverItem[]
  title?: string
}

const COLOR_MAP: Record<string, string> = {
  Vegetation: '#7ee2d0',
  Built: '#ff9a61',
  'Built-up': '#ff9a61',
  Water: '#6cb7dd',
  'Bare land': '#b08e67',
  Roads: '#879598',
  Forest: '#4caf7d',
  Agriculture: '#c7ef67',
  Wetlands: '#4da8b0',
  'Snow/Ice': '#ddeeff',
}

export default function LandCoverChart({ items, title = 'LAND COVER DISTRIBUTION' }: LandCoverChartProps) {
  if (!items.length) return null
  return (
    <div style={{ padding: '15px 0' }}>
      <div style={{ color: '#bbc7c5', font: "10px 'DM Mono'", letterSpacing: '1px', marginBottom: '14px' }}>{title}</div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {items.map((item) => {
          const color = COLOR_MAP[item.label] || item.color || '#879598'
          return (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#a9b8b7', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {item.label}
                </span>
                <span style={{ color: '#d3ddda', font: "10px 'DM Mono'" }}>{item.percent}%</span>
              </div>
              <div style={{ height: '5px', background: '#2f3e3d', borderRadius: '4px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${item.percent}%`,
                    background: color,
                    borderRadius: '4px',
                    transition: 'width 0.8s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

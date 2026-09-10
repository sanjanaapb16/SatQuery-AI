import type { ExecutionStep } from '../types'

interface AgentTimelineProps {
  steps: ExecutionStep[]
}

const STATUS_ICON: Record<ExecutionStep['status'], string> = {
  pending: '○',
  running: '◎',
  done: '✓',
  error: '✗',
}

const STATUS_COLOR: Record<ExecutionStep['status'], string> = {
  pending: '#4e6065',
  running: '#c7ef67',
  done: '#c7ef67',
  error: '#ff9a61',
}

export default function AgentTimeline({ steps }: AgentTimelineProps) {
  if (!steps.length) return null
  return (
    <div>
      <div style={{ color: '#bbc7c5', font: "10px 'DM Mono'", letterSpacing: '1px', marginBottom: '12px' }}>
        AGENT EXECUTION TIMELINE
      </div>
      <div style={{ display: 'grid', gap: '0' }}>
        {steps.map((step, i) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '9px 0',
              borderTop: i > 0 ? '1px solid #263338' : 'none',
              opacity: step.status === 'pending' ? 0.5 : 1,
              transition: 'opacity 0.3s',
            }}
          >
            {/* Icon + vertical line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '2px' }}>
              <span
                style={{
                  color: STATUS_COLOR[step.status],
                  fontSize: step.status === 'running' ? '13px' : '11px',
                  lineHeight: 1,
                  animation: step.status === 'running' ? 'pulse 1s infinite' : undefined,
                }}
              >
                {STATUS_ICON[step.status]}
              </span>
            </div>
            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '10px', color: step.status === 'done' ? '#d8e8e5' : '#8a9a9d' }}>
                  {step.label}
                </strong>
                {step.durationMs !== undefined && (
                  <time style={{ color: '#657477', font: "9px 'DM Mono'", flexShrink: 0 }}>
                    {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
                  </time>
                )}
              </div>
              <small style={{ display: 'block', color: '#657477', fontSize: '10px', marginTop: '2px' }}>
                {step.detail}
              </small>
              {step.model && (
                <small style={{ display: 'block', color: '#4e7066', font: "9px 'DM Mono'", marginTop: '2px' }}>
                  ↳ {step.model}
                </small>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

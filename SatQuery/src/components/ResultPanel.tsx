import { useState } from 'react'
import type { AnalysisOutput } from '../types'

interface ResultPanelProps {
  result: AnalysisOutput | null
  loading: boolean
  onGenerateReport: () => void
  onToggleVoice: () => void
  isSpeaking: boolean
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

export default function ResultPanel({ result, loading, onGenerateReport, onToggleVoice, isSpeaking }: ResultPanelProps) {
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div style={{ padding: '18px' }}>
        <div style={{ color: '#c7ef67', font: "10px 'DM Mono'", marginBottom: '14px' }}>AI ANSWER</div>
        <div className="skeleton-block" style={{ height: '14px', width: '80%', marginBottom: '8px', background: '#2a373b', borderRadius: '3px' }} />
        <div className="skeleton-block" style={{ height: '14px', width: '60%', marginBottom: '8px', background: '#2a373b', borderRadius: '3px' }} />
        <div className="skeleton-block" style={{ height: '14px', width: '70%', background: '#2a373b', borderRadius: '3px' }} />
        <div style={{ marginTop: '20px', color: '#4e6065', fontSize: '11px' }}>Analyzing imagery…</div>
      </div>
    )
  }

  if (!result) {
    return (
      <div style={{ padding: '18px', color: '#4e6065', fontSize: '11px', textAlign: 'center', paddingTop: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>◒</div>
        Upload imagery and ask a question to see the AI answer here.
      </div>
    )
  }

  const reliabilityColor = result.reliability === 'HIGH' ? '#c7ef67' : result.reliability === 'MEDIUM' ? '#e5bb61' : '#ff9a61'

  return (
    <div style={{ padding: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ color: '#c7ef67', font: "10px 'DM Mono'" }}>AI ANSWER</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onToggleVoice}
            style={{
              padding: '5px 9px', fontSize: '10px', border: '1px solid',
              borderColor: isSpeaking ? '#5e8147' : '#2a373b',
              background: isSpeaking ? '#263726' : 'transparent',
              color: isSpeaking ? '#c7ef67' : '#8a9a9d',
              borderRadius: '3px', cursor: 'pointer',
            }}
            aria-label={isSpeaking ? 'Pause voice answer' : 'Read answer aloud'}
          >
            {isSpeaking ? '❚❚ Pause' : '▶ Read'}
          </button>
          <button
            onClick={onGenerateReport}
            style={{
              padding: '5px 9px', fontSize: '10px', border: '1px solid #2a373b',
              background: 'transparent', color: '#8a9a9d', borderRadius: '3px', cursor: 'pointer',
            }}
            aria-label="Generate PDF report"
          >
            ⇩ Report
          </button>
        </div>
      </div>

      {/* Answer text */}
      <div
        style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: '20px', color: '#e9f0ee' }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(result.answer) }}
      />

      {/* Metrics */}
      {result.changeStats && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
          borderBlock: '1px solid #2a373b', padding: '13px 0', marginBottom: '16px',
        }}>
          <div>
            <strong style={{ display: 'block', color: '#eef6ef', fontSize: '19px' }}>
              {result.changeStats.changeDetected ? `+${result.changeStats.percentChanged}%` : '—'}
            </strong>
            <small style={{ color: '#819093', fontSize: '10px' }}>Change detected</small>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#eef6ef', fontSize: '19px' }}>
              {result.changeStats.affectedAreaHa} ha
            </strong>
            <small style={{ color: '#819093', fontSize: '10px' }}>Estimated area</small>
          </div>
        </div>
      )}

      {/* Confidence */}
      <div style={{ padding: '12px 0 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', font: "9px 'DM Mono'", color: '#8b9b9d', marginBottom: '6px' }}>
          <span>AI CONFIDENCE</span>
          <strong style={{ color: '#c7ef67', fontSize: '16px' }}>{result.confidence}%</strong>
        </div>
        <div style={{ height: '5px', background: '#2f3e3d', borderRadius: '4px', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${result.confidence}%`, background: '#c7ef67', borderRadius: '4px', transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span style={{ color: '#819093' }}>Reliability</span>
          <span style={{ color: reliabilityColor, font: "9px 'DM Mono'" }}>{result.reliability}</span>
        </div>
      </div>

      {/* Evidence */}
      {result.evidence.length > 0 && (
        <div style={{ borderTop: '1px solid #2a373b', paddingTop: '13px', marginTop: '6px' }}>
          <strong style={{ display: 'block', color: '#87989a', font: "9px 'DM Mono'", marginBottom: '8px' }}>
            EVIDENCE SIGNALS
          </strong>
          {(expanded ? result.evidence : result.evidence.slice(0, 3)).map((ev, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#bac8c5', fontSize: '10px' }}>✓ {ev.label}</span>
              <span style={{ color: '#4e7066', font: "9px 'DM Mono'" }}>{ev.confidence}%</span>
            </div>
          ))}
          {result.evidence.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ background: 'transparent', border: 0, color: '#c7ef67', fontSize: '10px', padding: 0, cursor: 'pointer', marginTop: '4px' }}
            >
              {expanded ? '▲ Show less' : `▼ ${result.evidence.length - 3} more signals`}
            </button>
          )}
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div style={{ borderTop: '1px solid #2a373b', paddingTop: '13px', marginTop: '10px' }}>
          <strong style={{ display: 'block', color: '#87989a', font: "9px 'DM Mono'", marginBottom: '8px' }}>
            NEXT RECOMMENDED
          </strong>
          {result.recommendations.slice(0, 4).map((rec, i) => (
            <div key={i} style={{ color: '#6cb7dd', fontSize: '10px', marginBottom: '6px' }}>
              → {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

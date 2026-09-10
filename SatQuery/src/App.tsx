import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type Mode = 'General' | 'Change' | 'Optical + SAR' | 'Disaster' | 'Agriculture' | 'Urban growth'
const modes: { label: Mode; icon: string }[] = [
  { label: 'General', icon: '⌁' }, { label: 'Change', icon: '⇄' }, { label: 'Optical + SAR', icon: '◈' },
  { label: 'Disaster', icon: '△' }, { label: 'Agriculture', icon: '✳' }, { label: 'Urban growth', icon: '▦' },
]
const suggestions = ['Describe this scene', 'What type of land cover is present?', 'Where are the buildings?', 'Is there any water?']
const timeline = [
  ['Query understood', 'Intent classified as change + urban growth', '12 ms'],
  ['Inputs validated', '2 images · spatial match confirmed · CRS present', '84 ms'],
  ['Agent routed', 'Change Detection + Land Cover specialist', '18 ms'],
  ['Evidence generated', 'Change mask · 3 regions · area estimate', '1.8 s'],
]

function App() {
  const [mode, setMode] = useState<Mode>('Change')
  const [query, setQuery] = useState('Has the built-up area increased between these observations?')
  const [activeSuggestion, setActiveSuggestion] = useState('')
  const [files, setFiles] = useState(['Landsat_2024_06_18.tif', 'Landsat_2025_06_21.tif'])
  const [analyzing, setAnalyzing] = useState(false)
  const [heatmap, setHeatmap] = useState(true)
  const [opacity, setOpacity] = useState(68)
  const [showHistory, setShowHistory] = useState(false)
  const [toast, setToast] = useState('')
  const route = useMemo(() => {
    if (mode === 'Change' || /change|increased|decreased|between|before|after/i.test(query)) return 'Change Detection'
    if (mode === 'Optical + SAR' || /sar|optical|radar/i.test(query)) return 'Optical–SAR Fusion'
    if (/building|road|highlight|where/i.test(query)) return 'Grounding & Objects'
    if (/land cover|vegetation|water|forest/i.test(query)) return 'Land Cover Classification'
    return 'Remote Sensing VQA'
  }, [mode, query])
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).map((file) => file.name)
    if (selected.length) setFiles(selected.slice(0, 2))
  }
  const runAnalysis = () => {
    setAnalyzing(true)
    window.setTimeout(() => {
      setAnalyzing(false); setToast('Analysis complete · result saved to this session')
      window.setTimeout(() => setToast(''), 3200)
    }, 900)
  }
  const downloadReport = () => {
    const report = `SATQUERY AI REPORT\n\nQuery: ${query}\nTask: ${route}\nConfidence: 92%\nReliability: HIGH\n\nFinding: Built-up area increased by an estimated 13.4% between the two observations.\nEvidence: New structures detected in the eastern corridor; built-up pixels increased across 3 connected regions.\n\nAnalytical aid only. Not an authoritative emergency decision.`
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' })); const link = document.createElement('a')
    link.href = url; link.download = 'satquery-analysis-report.txt'; link.click(); URL.revokeObjectURL(url)
    setToast('Report exported · PDF service ready via Firebase Functions'); window.setTimeout(() => setToast(''), 3200)
  }
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">◒</span><span><strong>SATQUERY</strong><small>AI / REMOTE SENSING INTELLIGENCE</small></span></div><div className="top-actions"><span className="live-dot">●</span> SYSTEMS OPERATIONAL <button className="icon-button" aria-label="Notifications">♢</button><button className="avatar" aria-label="User profile">AS</button></div></header>
    <div className="workspace">
      <aside className="sidebar"><div className="eyebrow">MISSION CONTROL</div><button className="new-analysis" onClick={() => { setFiles([]); setQuery('') }}>＋ <span>New analysis</span><kbd>⌘ K</kbd></button><nav className="nav-list" aria-label="Main navigation"><button className="nav-item active"><span>⌁</span> Analysis <b>1</b></button><button className="nav-item" onClick={() => setShowHistory(!showHistory)}><span>◷</span> History</button><button className="nav-item"><span>▦</span> Projects</button><button className="nav-item"><span>▤</span> Reports</button></nav><div className="eyebrow side-label">WORKSPACES</div><button className="project"><i className="project-dot blue" /> Flood monitoring <span>›</span></button><button className="project"><i className="project-dot green" /> Urban expansion <span>›</span></button><button className="project"><i className="project-dot amber" /> Crop health 2025 <span>›</span></button><div className="side-footer"><div className="offline"><span /> Offline-ready</div><small>Firebase sync enabled</small><button className="settings">⚙ Settings</button></div></aside>
      <section className="main-column"><div className="page-heading"><div><div className="breadcrumb">ANALYSIS / LIVE SESSION</div><h1>Good morning, Anjali <span>✦</span></h1><p>Turn satellite data into clear, defensible answers.</p></div><button className="outline-button" onClick={downloadReport}>⇩ <span>Export report</span></button></div>
        <div className="mode-strip"><span className="eyebrow">ANALYSIS MODE</span>{modes.map((item) => <button key={item.label} className={mode === item.label ? 'mode active' : 'mode'} onClick={() => setMode(item.label)}><span>{item.icon}</span>{item.label}</button>)}</div>
        <section className="control-card"><div className="section-title"><span className="step">01</span><div><h2>Input imagery</h2><p>Upload, inspect, and pair your satellite observations.</p></div><span className="quality"><i /> GOOD QUALITY</span></div><div className="upload-grid"><label className="upload-zone"><input type="file" accept=".tif,.tiff,.png,.jpg,.jpeg" multiple onChange={handleFiles} /><span className="upload-icon">↥</span><strong>Drop GeoTIFF or image files</strong><small>Supports TIFF, GeoTIFF, PNG, JPEG · up to 2 GB</small><span className="browse">Browse files</span></label><div className="file-list"><div className="file-header"><span>SESSION INPUTS <b>{files.length || 0}/2</b></span><span className="meta-ok">✓ METADATA FOUND</span></div>{files.length ? files.map((file, index) => <div className="file-row" key={file}><span className={index ? 'file-icon sar' : 'file-icon'}>{index ? '≈' : '▥'}</span><span className="file-name"><strong>{file}</strong><small>{index ? 'Optical · 10m · EPSG:32643' : 'Multispectral · 10m · EPSG:32643'}</small></span><span className="file-status">✓</span></div>) : <div className="empty-files">Add imagery to begin an analysis.</div>}<button className="demo-button" onClick={() => { setFiles(['Sentinel-2_before.tif', 'Sentinel-2_after.tif']); setMode('Change') }}>✦ Load demo dataset</button></div></div></section>
        <section className="control-card query-card"><div className="section-title"><span className="step">02</span><div><h2>Ask your question</h2><p>SatQuery will select the right specialist model automatically.</p></div><span className="route-pill">AUTO ROUTE · {route}</span></div><textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask anything about your satellite imagery..." /><div className="query-bottom"><div className="suggestions"><span>Suggested</span>{suggestions.map((item) => <button key={item} className={activeSuggestion === item ? 'suggestion selected' : 'suggestion'} onClick={() => { setQuery(item); setActiveSuggestion(item) }}>{item}</button>)}</div><div className="query-actions"><button className="mic" aria-label="Voice input">♩</button><button className="analyze-button" onClick={runAnalysis}>{analyzing ? 'Analyzing…' : 'Analyze'} <span>→</span></button></div></div></section>
        <div className="result-heading"><div><div className="breadcrumb">03 / AGENT RESULT</div><h2>Built-up area increased</h2></div><span className="completed">✓ COMPLETED IN 2.4S</span></div><section className="result-grid"><div className="map-card"><div className="map-toolbar"><div><span className="map-title">CHANGE EVIDENCE</span><small>Eastern corridor · 18.6 ha analyzed</small></div><div className="map-tools"><button className={heatmap ? 'tool active' : 'tool'} onClick={() => setHeatmap(!heatmap)}>◌ Heatmap</button><button className="tool">▣ Compare</button><button className="tool">⌗</button></div></div><div className={heatmap ? 'satellite-map heatmap-on' : 'satellite-map'}><div className="map-grid" /><div className="river" /><div className="road road-one" /><div className="road road-two" /><div className="change-patch patch-one" /><div className="change-patch patch-two" /><div className="map-label label-one">NEW STRUCTURES <b>94%</b></div><div className="map-label label-two">+ 4.18 HA</div><div className="north">N<br /><span>↑</span></div><div className="map-coordinates">12°58'42&quot; N &nbsp; 77°35'19&quot; E</div></div><div className="map-footer"><span><i className="legend blue-legend" /> Water</span><span><i className="legend green-legend" /> Vegetation</span><span><i className="legend red-legend" /> Built-up change</span><label>Opacity <input type="range" min="0" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /> {opacity}%</label></div></div><div className="answer-card"><div className="answer-label">AI ANSWER <span>⌁</span></div><p>Built-up area <strong>increased</strong> between the two observations.</p><div className="metrics"><div><strong>+13.4%</strong><small>Change detected</small></div><div><strong>4.18 ha</strong><small>Estimated increase</small></div></div><div className="confidence"><div><span>AI CONFIDENCE</span><strong>92%</strong></div><div className="confidence-bar"><span /></div><p>High reliability · strong image quality, spatial agreement, and evidence overlap.</p></div><div className="evidence"><strong>EVIDENCE SIGNALS</strong><span>✓ New structures detected in east</span><span>✓ Built-up pixels increased</span><span>✓ Change concentrated in 3 regions</span></div><button className="evidence-button">View evidence detail <span>→</span></button></div></section>
        <section className="lower-grid"><div className="mini-card timeline-card"><div className="card-heading"><span>AGENT TIMELINE</span><button>View trace →</button></div>{timeline.map(([title, detail, time], index) => <div className="timeline-row" key={title}><span className="timeline-mark">{index === timeline.length - 1 ? '✦' : '✓'}</span><div><strong>{title}</strong><small>{detail}</small></div><time>{time}</time></div>)}</div><div className="mini-card distribution"><div className="card-heading"><span>LAND COVER SHIFT</span><button>Details →</button></div><div className="bars"><div><span>Built-up <b>28%</b></span><i className="bar built" /></div><div><span>Vegetation <b>42%</b></span><i className="bar veg" /></div><div><span>Water <b>15%</b></span><i className="bar water" /></div><div><span>Bare land <b>10%</b></span><i className="bar bare" /></div></div></div></section>
      </section>
      <aside className="right-rail"><div className="rail-header"><span className="eyebrow">SESSION CONTEXT</span><button className="icon-button">•••</button></div><div className="context-card"><div className="context-status"><span className="pulse" /> AGENT READY</div><h3>Urban expansion study</h3><p>Two observations · June 2024 → June 2025</p><div className="context-users"><span className="user-chip">AS</span><span className="user-chip teal">RK</span><span className="user-chip orange">+2</span><span>Shared with 4 collaborators</span></div></div><div className="rail-section"><div className="rail-title">NEXT RECOMMENDED <span>✦</span></div><button className="recommendation"><span>▥</span><div><strong>Calculate changed area</strong><small>Generate a precise polygon estimate</small></div><b>→</b></button><button className="recommendation"><span>◈</span><div><strong>Run optical–SAR comparison</strong><small>Fuse structural + spectral signals</small></div><b>→</b></button><button className="recommendation" onClick={downloadReport}><span>▤</span><div><strong>Generate PDF report</strong><small>Package findings and evidence</small></div><b>→</b></button></div><div className="rail-section history-preview"><div className="rail-title">RECENT ANALYSES <button onClick={() => setShowHistory(!showHistory)}>View all</button></div><div className="history-item"><span className="history-thumb change-thumb">⇄</span><div><strong>Floodplain expansion</strong><small>Change analysis · 8 min ago</small></div><span>›</span></div><div className="history-item"><span className="history-thumb urban-thumb">▦</span><div><strong>Building inventory</strong><small>Grounding · Yesterday</small></div><span>›</span></div></div>{showHistory && <div className="history-popover"><strong>SESSION HISTORY</strong><p>3 analyses synced to Firestore</p><button onClick={() => setShowHistory(false)}>Close</button></div>}<div className="disclaimer"><span>ⓘ</span><p>AI analysis is an analytical aid. Validate outputs before operational decisions.</p></div></aside>
    </div>{toast && <div className="toast">✓ {toast}</div>}
  </main>
}
export default App

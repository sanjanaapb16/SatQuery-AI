import type { AnalysisOutput, ChangeStats, LandCoverItem, AreaEstimate } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// SatQuery AI — PDF Report Generator (jsPDF)
// ─────────────────────────────────────────────────────────────────────────────

interface ReportInput {
  query: string
  mode: string
  files: string[]
  result: AnalysisOutput
  userName?: string
  projectName?: string
}

export async function generatePDFReport(input: ReportInput): Promise<void> {
  // Dynamic import so jsPDF is only loaded when needed
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentW = pageW - margin * 2
  let y = margin

  const palette = {
    bg: [16, 22, 25] as [number, number, number],
    lime: [199, 239, 103] as [number, number, number],
    text: [233, 240, 238] as [number, number, number],
    muted: [139, 154, 157] as [number, number, number],
    panel: [23, 33, 38] as [number, number, number],
    line: [42, 55, 59] as [number, number, number],
  }

  // ─── Helper Functions ──────────────────────────────────────────────────────

  function fillPage(color: [number, number, number] = palette.bg) {
    doc.setFillColor(...color)
    doc.rect(0, 0, pageW, pageH, 'F')
  }

  function setFont(size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = palette.text) {
    doc.setFontSize(size)
    doc.setFont('helvetica', style)
    doc.setTextColor(...color)
  }

  function addText(text: string, x: number, yPos: number, options?: { align?: 'left' | 'center' | 'right'; maxWidth?: number }) {
    doc.text(text, x, yPos, options)
  }

  function newPage() {
    doc.addPage()
    fillPage()
    y = margin
  }

  function checkPageBreak(height = 20) {
    if (y + height > pageH - margin) newPage()
  }

  function drawPanel(yStart: number, height: number, color: [number, number, number] = palette.panel) {
    doc.setFillColor(...color)
    doc.roundedRect(margin, yStart, contentW, height, 2, 2, 'F')
  }

  function drawLine(yPos: number) {
    doc.setDrawColor(...palette.line)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, margin + contentW, yPos)
  }

  // ─── Cover Page ────────────────────────────────────────────────────────────

  fillPage()

  // Brand mark
  doc.setFillColor(...palette.lime)
  doc.circle(margin + 8, margin + 8, 5, 'F')
  setFont(22, 'bold', palette.lime)
  addText('SATQUERY AI', margin + 18, margin + 11)
  setFont(7, 'normal', palette.muted)
  addText('REMOTE SENSING INTELLIGENCE · ISRO/SAC EVALUATION READY', margin + 18, margin + 17)

  y = 60
  setFont(28, 'bold', palette.text)
  const titleLines = doc.splitTextToSize('Analysis Report', contentW)
  titleLines.forEach((line: string) => { addText(line, margin, y); y += 12 })

  y += 10
  setFont(11, 'normal', palette.muted)
  addText(new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), margin, y)

  y += 20
  drawPanel(y, 55, [23, 40, 47])
  y += 12
  setFont(8, 'bold', palette.lime)
  addText('ANALYSIS QUERY', margin + 8, y)
  y += 8
  setFont(10, 'normal', palette.text)
  const queryLines = doc.splitTextToSize(`"${input.query}"`, contentW - 16)
  queryLines.slice(0, 3).forEach((line: string) => { addText(line, margin + 8, y); y += 6 })

  y += 20
  drawPanel(y, 42, palette.panel)
  y += 10
  const infoItems = [
    ['MODE', input.mode],
    ['TASK', input.result.task.replace('_', ' ').toUpperCase()],
    ['CONFIDENCE', `${input.result.confidence}%`],
    ['RELIABILITY', input.result.reliability],
  ]
  infoItems.forEach(([label, value], i) => {
    const x = margin + 8 + (i % 2) * (contentW / 2)
    const rowY = y + Math.floor(i / 2) * 12
    setFont(7, 'bold', palette.muted); addText(label, x, rowY)
    setFont(10, 'bold', i === 2 || i === 3 ? palette.lime : palette.text); addText(value, x, rowY + 6)
  })

  y += 50
  if (input.files.length) {
    setFont(7, 'bold', palette.muted)
    addText('INPUT IMAGERY', margin, y); y += 7
    input.files.forEach((file) => {
      setFont(9, 'normal', palette.text)
      addText(`• ${file}`, margin + 4, y); y += 6
    })
  }

  // ─── Page 2 — AI Answer ───────────────────────────────────────────────────

  newPage()
  setFont(8, 'bold', palette.lime)
  addText('SECTION 01 — AI ANSWER', margin, y); y += 10
  drawLine(y); y += 10

  const answerText = input.result.answer.replace(/\*\*/g, '').replace(/\*/g, '')
  setFont(10, 'normal', palette.text)
  const answerLines = doc.splitTextToSize(answerText, contentW)
  answerLines.forEach((line: string) => {
    checkPageBreak(8)
    addText(line, margin, y); y += 7
  })

  // ─── Confidence ───────────────────────────────────────────────────────────

  y += 10
  checkPageBreak(35)
  drawPanel(y, 30, [23, 40, 47])
  y += 10
  setFont(8, 'bold', palette.muted)
  addText('AI CONFIDENCE', margin + 8, y)
  addText('RELIABILITY', margin + contentW / 2, y)
  y += 8
  setFont(18, 'bold', palette.lime)
  addText(`${input.result.confidence}%`, margin + 8, y)
  setFont(14, 'bold', palette.lime)
  addText(input.result.reliability, margin + contentW / 2, y)
  y += 14

  // ─── Evidence ─────────────────────────────────────────────────────────────

  if (input.result.evidence.length) {
    y += 10
    checkPageBreak(10)
    setFont(8, 'bold', palette.lime)
    addText('SECTION 02 — EVIDENCE SIGNALS', margin, y); y += 8
    drawLine(y); y += 8

    input.result.evidence.forEach((ev) => {
      checkPageBreak(10)
      setFont(9, 'normal', palette.text)
      addText(`✓ ${ev.label}`, margin + 4, y)
      setFont(8, 'bold', palette.muted)
      addText(`${ev.confidence}%`, margin + contentW - 12, y)
      y += 8
    })
  }

  // ─── Land Cover ───────────────────────────────────────────────────────────

  const landCover: LandCoverItem[] = input.result.landCover || []
  if (landCover.length) {
    y += 10
    checkPageBreak(60)
    setFont(8, 'bold', palette.lime)
    addText('SECTION 03 — LAND COVER DISTRIBUTION', margin, y); y += 8
    drawLine(y); y += 8

    landCover.forEach((item) => {
      checkPageBreak(12)
      setFont(9, 'normal', palette.text)
      addText(item.label, margin + 4, y)
      setFont(9, 'bold', palette.lime)
      addText(`${item.percent}%`, margin + contentW - 16, y)
      // Progress bar
      const barW = (item.percent / 100) * (contentW - 32)
      doc.setFillColor(...palette.line)
      doc.rect(margin + 4, y + 2, contentW - 32, 3, 'F')
      doc.setFillColor(...palette.lime)
      doc.rect(margin + 4, y + 2, barW, 3, 'F')
      y += 12
    })
  }

  // ─── Change Stats ─────────────────────────────────────────────────────────

  const change: ChangeStats | undefined = input.result.changeStats
  if (change) {
    y += 10
    checkPageBreak(60)
    setFont(8, 'bold', palette.lime)
    addText('SECTION 04 — CHANGE STATISTICS', margin, y); y += 8
    drawLine(y); y += 8

    const stats = [
      ['Change detected', change.changeDetected ? 'YES' : 'NO'],
      ['Percent changed', `${change.percentChanged}%`],
      ['Affected area', `${change.affectedAreaHa} ha (estimate)`],
      ...(change.builtUpChange !== undefined ? [['Built-up change', `${change.builtUpChange > 0 ? '+' : ''}${change.builtUpChange} ha`]] : []),
      ...(change.vegetationChange !== undefined ? [['Vegetation change', `${change.vegetationChange > 0 ? '+' : ''}${change.vegetationChange} ha`]] : []),
      ...(change.waterChange !== undefined ? [['Water change', `${change.waterChange > 0 ? '+' : ''}${change.waterChange} ha`]] : []),
    ]
    stats.forEach(([label, value]) => {
      checkPageBreak(10)
      setFont(8, 'bold', palette.muted); addText(label, margin + 4, y)
      setFont(9, 'normal', palette.text); addText(value, margin + 80, y)
      y += 9
    })

    if (change.majorChanges?.length) {
      y += 4
      setFont(8, 'bold', palette.muted); addText('MAJOR CHANGES', margin + 4, y); y += 7
      change.majorChanges.forEach((c) => {
        checkPageBreak(8)
        setFont(9, 'normal', palette.text); addText(`• ${c}`, margin + 8, y); y += 7
      })
    }
  }

  // ─── Area Estimates ───────────────────────────────────────────────────────

  const areas: AreaEstimate[] = input.result.areaEstimates || []
  if (areas.length) {
    y += 10
    checkPageBreak(50)
    setFont(8, 'bold', palette.lime)
    addText('SECTION 05 — AREA ESTIMATES', margin, y); y += 8
    drawLine(y); y += 8

    areas.forEach((area) => {
      checkPageBreak(10)
      setFont(9, 'normal', palette.text)
      addText(`• ${area.label}`, margin + 4, y)
      setFont(9, 'bold', palette.lime)
      addText(`${area.valueHa} ha${area.isEstimate ? ' (est.)' : ''}`, margin + contentW - 30, y)
      y += 9
    })
  }

  // ─── Agent Timeline ───────────────────────────────────────────────────────

  if (input.result.executionTrace?.length) {
    y += 10
    checkPageBreak(70)
    setFont(8, 'bold', palette.lime)
    addText('SECTION 06 — AGENT EXECUTION TIMELINE', margin, y); y += 8
    drawLine(y); y += 8

    input.result.executionTrace.forEach((step) => {
      checkPageBreak(12)
      setFont(9, 'normal', palette.text)
      addText(`✓ ${step.label}`, margin + 4, y)
      if (step.durationMs) {
        setFont(8, 'normal', palette.muted)
        addText(`${step.durationMs}ms`, margin + contentW - 16, y)
      }
      setFont(8, 'normal', palette.muted)
      addText(step.detail, margin + 10, y + 6)
      y += 13
    })
  }

  // ─── Model Information ────────────────────────────────────────────────────

  y += 10
  checkPageBreak(40)
  setFont(8, 'bold', palette.lime)
  addText('SECTION 07 — MODEL INFORMATION', margin, y); y += 8
  drawLine(y); y += 8

  setFont(9, 'normal', palette.text)
  const modelLines = [
    `Task: ${input.result.task.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`,
    `Model selected by: SatQuery Agent Controller (automated routing)`,
    `Execution framework: Modular specialist model registry`,
  ]
  modelLines.forEach((line) => { addText(line, margin + 4, y); y += 7 })

  // ─── Disclaimer ───────────────────────────────────────────────────────────

  y += 20
  checkPageBreak(40)
  drawPanel(y, 38, [30, 20, 20])
  y += 10
  setFont(8, 'bold', [220, 140, 110])
  addText('DISCLAIMER', margin + 8, y); y += 8
  setFont(8, 'normal', palette.text)
  const disclaimer = 'SatQuery AI analysis is an analytical aid and is NOT an authoritative emergency, agricultural, or legal decision. All area estimates are approximate unless verified with calibrated geospatial data. AI confidence scores are heuristic indicators and may not be statistically calibrated.'
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentW - 16)
  disclaimerLines.forEach((line: string) => { addText(line, margin + 8, y); y += 6 })

  // ─── Footer ───────────────────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    setFont(7, 'normal', palette.muted)
    addText(`SatQuery AI · Remote Sensing Intelligence · Page ${i} of ${totalPages}`, margin, pageH - 8)
    addText('ISRO/SAC Evaluation Ready', pageW - margin, pageH - 8, { align: 'right' })
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  const filename = `satquery-report-${Date.now()}.pdf`
  doc.save(filename)
}

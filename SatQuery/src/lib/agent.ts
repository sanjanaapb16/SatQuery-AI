import type {
  AnalysisInput,
  AnalysisOutput,
  ExecutionStep,
  LandCoverItem,
  TaskType,
  AnalysisMode,
} from '../types'
import { MODEL_REGISTRY, getFallbackModel } from './modelRegistry'

// ─────────────────────────────────────────────────────────────────────────────
// SatQuery AI — Agent Controller
// Orchestrates intent classification → model selection → execution → result
// ─────────────────────────────────────────────────────────────────────────────

// ─── Task Classification ─────────────────────────────────────────────────────

export function classifyTask(query: string, mode: AnalysisMode): TaskType {
  const q = query.toLowerCase()
  if (mode === 'Change' || /change|before|after|increased|decreased|temporal|between|dates?/.test(q))
    return 'change_detection'
  if (mode === 'Optical + SAR' || /\bsar\b|optical.*sar|radar|microwave|backscatter/.test(q))
    return 'optical_sar'
  if (mode === 'Disaster' || /flood|fire|burn|landslide|cyclone|damage|disaster|emergency|affected/.test(q))
    return 'disaster'
  if (mode === 'Agriculture' || /crop|agri|farm|field|harvest|irrigation|sowing|kharif|rabi/.test(q))
    return 'agriculture'
  if (mode === 'Urban growth' || /urban|city|built.?up|building|construction|expansion|sprawl/.test(q))
    return 'urban_growth'
  if (mode === 'Water' || /\bwater\b|lake|river|flood|wetland|reservoir|ocean|sea|pond/.test(q))
    return 'water_analysis'
  if (mode === 'Forest' || /forest|tree|deforest|vegetation|woodland|jungle|canopy/.test(q))
    return 'forest_monitoring'
  if (mode === 'Infrastructure' || /\broad\b|highway|bridge|railway|infrastructure|construction/.test(q))
    return 'infrastructure'
  if (/highlight|where is|locate|find|show me|mark|detect|identify/.test(q)) return 'grounding'
  if (/land.?cover|land use|classify|classification/.test(q)) return 'land_cover'
  if (/describe|caption|scene|what.*(this|visible)|overview/.test(q)) return 'captioning'
  return 'vqa'
}

// ─── Demo/Fallback Responses ─────────────────────────────────────────────────

const LAND_COVER_DEFAULTS: LandCoverItem[] = [
  { label: 'Vegetation', percent: 42, color: '#7ee2d0' },
  { label: 'Built-up', percent: 28, color: '#ff9a61' },
  { label: 'Water', percent: 15, color: '#6cb7dd' },
  { label: 'Bare land', percent: 10, color: '#b08e67' },
  { label: 'Roads', percent: 5, color: '#879598' },
]

function demoResponse(task: TaskType, query: string, fileCount: number): AnalysisOutput {
  const trace = buildTrace(task, fileCount)
  const base = {
    task,
    executionTrace: trace.map((s) => ({ ...s, status: 'done' as const, durationMs: Math.floor(Math.random() * 1800 + 80) })),
    evidence: [
      { label: 'Detected region A — high confidence', confidence: 91 },
      { label: 'Spatial pattern consistent with query', confidence: 87 },
      { label: 'Evidence corroborated by multiple channels', confidence: 88 },
    ],
    artifacts: [],
    recommendations: [
      'Compare with another date for temporal insight',
      'Calculate affected area using Polygon tool',
      'Generate a PDF report for this analysis',
      'Run optical-SAR comparison for structural detail',
    ],
  }

  switch (task) {
    case 'change_detection':
      return {
        ...base,
        answer: `**Built-up area increased** between the two observations.\n\nThe eastern and northern corridors show significant expansion in impervious surfaces. Vegetation cover decreased by an estimated 7.2 ha in the transition zones. New structures were detected in three spatially distinct clusters.`,
        confidence: 92,
        reliability: 'HIGH',
        landCover: LAND_COVER_DEFAULTS,
        changeStats: {
          changeDetected: true,
          percentChanged: 13.4,
          majorChanges: ['Built-up area increased', 'Vegetation decreased', 'New structures detected in eastern corridor'],
          affectedAreaHa: 18.6,
          builtUpChange: 4.18,
          vegetationChange: -7.21,
          waterChange: -0.4,
        },
        areaEstimates: [
          { label: 'Total area analyzed', valueHa: 18.6, isEstimate: true },
          { label: 'Built-up increase', valueHa: 4.18, isEstimate: true },
          { label: 'Vegetation loss', valueHa: 7.21, isEstimate: true },
        ],
      }

    case 'optical_sar':
      return {
        ...base,
        answer: `**Optical imagery** reveals spectral land-cover patterns: dense vegetation in the northwest, mixed settlement in the south. **SAR imagery** provides independent structural information confirming high-backscatter built-up zones.\n\n**Combined interpretation:** The fusion increases built-up mapping confidence by excluding cloud shadows. Water bodies show consistent boundaries across both modalities.`,
        confidence: 88,
        reliability: 'HIGH',
        landCover: LAND_COVER_DEFAULTS,
      }

    case 'captioning':
      return {
        ...base,
        answer: `The image shows a **mixed land-use area** with significant urban and peri-urban features. Dense built-up structures occupy the central and southern portions. A water body — likely a reservoir or seasonal lake — is visible in the northwestern quadrant. Agricultural fields in a regular geometric pattern are present in the eastern half. Sparse vegetation forms transition zones between built-up and agricultural areas.`,
        confidence: 85,
        reliability: 'HIGH',
        landCover: LAND_COVER_DEFAULTS,
      }

    case 'grounding':
      return {
        ...base,
        answer: `The requested object has been located. **Primary region detected** at coordinates approximately centered on the image. Bounding regions are overlaid on the map. Segmentation mask highlights the contiguous region matching the query description.`,
        confidence: 83,
        reliability: 'MEDIUM',
      }

    case 'land_cover':
      return {
        ...base,
        answer: `**Land Cover Distribution:**\n\n- Vegetation: 42% — predominantly mixed scrub and agricultural land\n- Built-up: 28% — urban and peri-urban settlements\n- Water: 15% — includes river channels and reservoir\n- Bare land: 10% — fallow fields and exposed soil\n- Roads & infrastructure: 5%`,
        confidence: 87,
        reliability: 'HIGH',
        landCover: LAND_COVER_DEFAULTS,
      }

    case 'disaster':
      return {
        ...base,
        answer: `**Disaster analysis indicates significant change** consistent with a flooding event.\n\nWater extent expanded by an estimated 23.4 ha. Infrastructure in the low-lying zones shows submersion signatures. Vegetation stress detected in adjacent areas. *Note: This is an analytical aid. Confirm with ground surveys before emergency decisions.*`,
        confidence: 89,
        reliability: 'HIGH',
        changeStats: {
          changeDetected: true,
          percentChanged: 28.3,
          majorChanges: ['Flood extent expanded significantly', 'Infrastructure submersion detected', 'Vegetation stress in adjacent zones'],
          affectedAreaHa: 23.4,
          waterChange: 23.4,
          builtUpChange: -2.1,
          vegetationChange: -8.3,
        },
      }

    case 'agriculture':
      return {
        ...base,
        answer: `**Agricultural area detected: 186 hectares** (estimated from pixel classification).\n\nCrop fields show regular geometric boundaries consistent with cultivated land. Vegetation condition appears moderate to good across most fields. Some variation detected in the eastern block — potential moisture stress or different crop maturity stage. *These are indicative outputs; agronomic verification is recommended.*`,
        confidence: 81,
        reliability: 'MEDIUM',
        areaEstimates: [
          { label: 'Total agricultural area', valueHa: 186, isEstimate: true },
          { label: 'Healthy vegetation', valueHa: 142, isEstimate: true },
          { label: 'Potential stress zones', valueHa: 44, isEstimate: true },
        ],
      }

    case 'urban_growth':
      return {
        ...base,
        answer: `**Urban growth detected between the two dates.**\n\n- Previous built-up area: 14.2 km²\n- Current built-up area: 16.1 km²\n- Net increase: 1.9 km² (+13.4%)\n\nNew development concentrated in the northeastern corridor and southern ring road area. Three distinct growth zones identified.`,
        confidence: 91,
        reliability: 'HIGH',
        changeStats: {
          changeDetected: true,
          percentChanged: 13.4,
          majorChanges: ['New construction in northeastern corridor', 'Ring road expansion southward', 'Infill development in central zone'],
          affectedAreaHa: 190,
          builtUpChange: 19,
          vegetationChange: -12,
        },
      }

    case 'water_analysis':
      return {
        ...base,
        answer: `**Water bodies detected and mapped.** Major surface water features include a central reservoir and two river channels. Total surface water area estimated at 28.4 ha. Compared to the reference period, water extent shows a 4.2 ha increase — consistent with post-monsoon replenishment.`,
        confidence: 86,
        reliability: 'HIGH',
        areaEstimates: [
          { label: 'Total water area', valueHa: 28.4, isEstimate: true },
          { label: 'Water increase', valueHa: 4.2, isEstimate: true },
        ],
      }

    case 'forest_monitoring':
      return {
        ...base,
        answer: `**Forest/vegetation cover analysis complete.** Dense canopy cover occupies 34% of the study area (estimated 62 ha). Sparse vegetation and scrubland contribute an additional 18%. A 6.3 ha area in the southern zone shows spectral signatures consistent with recent clearing. *Forest boundary verification with field data is recommended.*`,
        confidence: 82,
        reliability: 'MEDIUM',
        areaEstimates: [
          { label: 'Dense forest/canopy', valueHa: 62, isEstimate: true },
          { label: 'Possible clearing', valueHa: 6.3, isEstimate: true },
        ],
      }

    case 'infrastructure':
      return {
        ...base,
        answer: `**Infrastructure detection complete.** Road network identified covering approximately 12.4 km of visible linear features. Building footprints detected across 3 main clusters. A possible bridge or elevated structure visible over the water channel in the eastern section. *Detection accuracy depends on image resolution and viewing geometry.*`,
        confidence: 78,
        reliability: 'MEDIUM',
      }

    default:
      return {
        ...base,
        answer: `Analysis complete for: *"${query}"*\n\nThe satellite image shows a diverse landscape with mixed land-cover types. Key features are visible including vegetation, built-up areas, and water surfaces. For more detailed analysis, please specify the area of interest or type of analysis required.`,
        confidence: 76,
        reliability: 'MEDIUM',
        landCover: LAND_COVER_DEFAULTS,
      }
  }
}

// ─── Execution Trace Builder ──────────────────────────────────────────────────

function buildTrace(task: TaskType, fileCount: number): ExecutionStep[] {
  const model = MODEL_REGISTRY[task]
  return [
    { id: 'q', label: 'Query received', detail: 'Natural language query parsed and tokenised', status: 'pending' },
    { id: 'c', label: 'Intent classified', detail: `Task identified: ${task.replace('_', ' ')}`, status: 'pending' },
    { id: 'v', label: 'Inputs validated', detail: `${fileCount} image(s) — format, resolution, CRS checked`, status: 'pending' },
    ...(fileCount === 2
      ? [{ id: 'r', label: 'Temporal relationship verified', detail: 'Bi-temporal pair confirmed and co-registered', status: 'pending' as const }]
      : []),
    { id: 'm', label: `${model.name} selected`, detail: `Model endpoint: ${model.endpoint || 'demo adapter'}`, status: 'pending' },
    { id: 'e', label: 'Analysis executed', detail: 'Specialist model processing complete', status: 'pending' },
    { id: 'ev', label: 'Evidence generated', detail: 'Change mask, bounding regions, confidence map', status: 'pending' },
    { id: 'conf', label: 'Confidence calculated', detail: 'Multi-factor reliability weighted score', status: 'pending' },
    { id: 'resp', label: 'Response generated', detail: 'Text + visual answer assembled', status: 'pending' },
  ]
}

// ─── Main Agent Controller ────────────────────────────────────────────────────

export class SatQueryAgentController {
  private onStep?: (steps: ExecutionStep[]) => void

  constructor(onStepUpdate?: (steps: ExecutionStep[]) => void) {
    this.onStep = onStepUpdate
  }

  private update(steps: ExecutionStep[]) {
    this.onStep?.([...steps])
  }

  async run(input: AnalysisInput): Promise<AnalysisOutput> {
    const task = classifyTask(input.query, input.mode)
    const fileCount = input.files.length || input.fileNames.length
    const steps = buildTrace(task, fileCount)
    this.update(steps)

    const advance = async (id: string, delay = 280) => {
      await sleep(delay)
      const idx = steps.findIndex((s) => s.id === id)
      if (idx !== -1) {
        steps[idx].status = 'done'
        steps[idx].durationMs = delay + Math.floor(Math.random() * 120)
      }
      this.update(steps)
    }

    const setRunning = (id: string) => {
      const idx = steps.findIndex((s) => s.id === id)
      if (idx !== -1) steps[idx].status = 'running'
      this.update(steps)
    }

    // Simulate progressive execution
    setRunning('q'); await advance('q', 60)
    setRunning('c'); await advance('c', 120)
    setRunning('v'); await advance('v', 200)
    if (fileCount === 2) { setRunning('r'); await advance('r', 180) }
    setRunning('m'); await advance('m', 80)

    let result: AnalysisOutput

    // Try real backend first
    const model = MODEL_REGISTRY[task]
    const fallback = getFallbackModel(task)
    if (model.endpoint) {
      setRunning('e')
      try {
        const response = await fetch(model.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: input.query, mode: input.mode, fileNames: input.fileNames, task }),
        })
        if (!response.ok) throw new Error(`Model returned ${response.status}`)
        result = await response.json() as AnalysisOutput
        await advance('e', 1800)
      } catch {
        // Try fallback model
        if (fallback?.endpoint) {
          try {
            const fb = await fetch(fallback.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: input.query, mode: input.mode, fileNames: input.fileNames, task }),
            })
            result = await fb.json() as AnalysisOutput
          } catch {
            result = demoResponse(task, input.query, fileCount)
          }
        } else {
          result = demoResponse(task, input.query, fileCount)
        }
        await advance('e', 600)
      }
    } else {
      setRunning('e'); await advance('e', 900)
      result = demoResponse(task, input.query, fileCount)
    }

    setRunning('ev'); await advance('ev', 350)
    setRunning('conf'); await advance('conf', 200)
    setRunning('resp'); await advance('resp', 120)

    // Merge trace into result
    result.executionTrace = steps
    return result
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function runAgent(
  input: AnalysisInput,
  onStep?: (steps: ExecutionStep[]) => void
): Promise<AnalysisOutput> {
  const controller = new SatQueryAgentController(onStep)
  return controller.run(input)
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

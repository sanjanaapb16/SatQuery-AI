export type AnalysisInput = { files: File[]; query: string; mode: string }
export type AnalysisEvidence = { label: string; confidence: number; geometry?: unknown }
export type AnalysisOutput = { answer: string; task: string; confidence: number; reliability: 'LOW' | 'MEDIUM' | 'HIGH'; evidence: AnalysisEvidence[]; artifacts: string[] }

export interface RemoteSensingModel {
  name: string
  supportedTasks: string[]
  validate(input: AnalysisInput): Promise<{ valid: boolean; warnings: string[] }>
  predict(input: AnalysisInput): Promise<AnalysisOutput>
}

export const modelRegistry = {
  vqa: { name: 'Remote Sensing VQA adapter', endpoint: import.meta.env.VITE_AI_BACKEND_URL || '', enabled: true },
  captioning: { name: 'Remote Scene Captioning adapter', endpoint: import.meta.env.VITE_AI_BACKEND_URL || '', enabled: true },
  grounding: { name: 'Text Guided Grounding adapter', endpoint: import.meta.env.VITE_AI_BACKEND_URL || '', enabled: true },
  change_detection: { name: 'Bi-temporal Change Detection adapter', endpoint: import.meta.env.VITE_AI_BACKEND_URL || '', enabled: true },
  optical_sar: { name: 'Optical SAR Fusion adapter', endpoint: import.meta.env.VITE_AI_BACKEND_URL || '', enabled: true },
  land_cover: { name: 'Land Cover Classification adapter', endpoint: import.meta.env.VITE_AI_BACKEND_URL || '', enabled: true },
}

export function classifyTask(query: string, mode: string) {
  if (mode === 'Change' || /change|before|after|increased|decreased/i.test(query)) return 'change_detection'
  if (mode === 'Optical + SAR' || /sar|optical|radar/i.test(query)) return 'optical_sar'
  if (/highlight|where|building|road|field/i.test(query)) return 'grounding'
  if (/land cover|vegetation|water|forest|agriculture/i.test(query)) return 'land_cover'
  if (/describe|caption|scene/i.test(query)) return 'captioning'
  return 'vqa'
}

export async function runAgent(input: AnalysisInput): Promise<AnalysisOutput> {
  const task = classifyTask(input.query, input.mode)
  const endpoint = modelRegistry[task as keyof typeof modelRegistry].endpoint
  if (!endpoint) return { task, answer: 'The SatQuery model service is not configured. Connect VITE_AI_BACKEND_URL to run real remote-sensing inference.', confidence: 0, reliability: 'LOW', evidence: [], artifacts: [] }
  const response = await fetch(`${endpoint}/v1/analyze`, { method: 'POST', body: JSON.stringify({ ...input, files: input.files.map((file) => file.name) }), headers: { 'Content-Type': 'application/json' } })
  if (!response.ok) throw new Error(`Model service returned ${response.status}`)
  return response.json() as Promise<AnalysisOutput>
}

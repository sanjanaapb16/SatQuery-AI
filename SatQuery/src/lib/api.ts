export type AnalysisRequest = {
  query: string
  modalities?: string[]
  dates?: string[]
  demo?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export async function analyze(request: AnalysisRequest) {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modalities: ['optical', 'sar'], dates: ['2023', '2025'], demo: true, ...request }),
  })
  if (!response.ok) throw new Error(`Analysis request failed (${response.status})`)
  return response.json()
}

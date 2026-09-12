import { getDemoAnalysis } from './ai/aiService'
import { supabase } from '../lib/supabase'
import type { AnalysisMode, AnalysisResult, UploadedImage } from '../types'

const analysisApiUrl = import.meta.env.VITE_ANALYSIS_API_URL as string | undefined
const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
const openAiModel = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || 'gpt-4o-mini'

function normalizeAnalysisResult(
  payload: Partial<AnalysisResult> | null | undefined,
  mode: AnalysisMode,
  query: string,
  images: UploadedImage[],
): AnalysisResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid analysis response from live provider.')
  }

  return {
    id: payload.id || `analysis-${Date.now()}`,
    summary: payload.summary || `Live analysis completed for ${mode}.`,
    detailed_explanation:
      payload.detailed_explanation || `The live analysis processed ${images.length} image(s) for the prompt: ${query}.`,
    confidence_score: typeof payload.confidence_score === 'number' ? payload.confidence_score : 90,
    reliability_score: typeof payload.reliability_score === 'number' ? payload.reliability_score : 88,
    detected_objects: Array.isArray(payload.detected_objects) ? payload.detected_objects : [],
    detected_changes: Array.isArray(payload.detected_changes) ? payload.detected_changes : [],
    land_cover_result: Array.isArray(payload.land_cover_result) ? payload.land_cover_result : [],
    area_measurements: Array.isArray(payload.area_measurements) ? payload.area_measurements : [],
    recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : [],
    evidence_data: Array.isArray(payload.evidence_data) ? payload.evidence_data : [],
    agent_steps: Array.isArray(payload.agent_steps) ? payload.agent_steps : [],
    analysis_type: mode,
    status: payload.status || 'completed',
    demoMode: false,
    created_at: payload.created_at || new Date().toISOString(),
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to convert image to data URL.'))
    reader.readAsDataURL(blob)
  })
}

async function imageToDataUrl(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return imageUrl
    }

    const blob = await response.blob()
    return await blobToDataUrl(blob)
  } catch {
    return imageUrl
  }
}

async function callRemoteAnalysisApi({
  mode,
  query,
  images,
}: {
  mode: AnalysisMode
  query: string
  images: UploadedImage[]
}): Promise<AnalysisResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(analysisApiUrl!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      mode,
      query,
      images: images.map((image) => ({
        id: image.id,
        name: image.name,
        imageType: image.imageType,
        localUrl: image.localUrl,
      })),
    }),
  })

  if (!response.ok) {
    throw new Error(`Remote analysis API returned ${response.status}`)
  }

  const payload = (await response.json()) as Partial<AnalysisResult> | { result?: Partial<AnalysisResult> }
  const result = 'result' in payload && payload.result ? payload.result : (payload as Partial<AnalysisResult>)

  return normalizeAnalysisResult(result, mode, query, images)
}

async function callOpenAiVisionApi({
  mode,
  query,
  images,
}: {
  mode: AnalysisMode
  query: string
  images: UploadedImage[]
}): Promise<AnalysisResult> {
  if (!openAiApiKey) {
    throw new Error('OpenAI API key missing.')
  }

  const imagePayloads = await Promise.all(
    images.map(async (image) => ({
      type: 'input_image',
      image_url: await imageToDataUrl(image.localUrl),
    })),
  )

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: openAiModel,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `You are SatQuery AI, an interactive remote sensing vision-language assistant. Analyze the provided image(s) for the query below. Return ONLY valid JSON matching this structure with no markdown wrappers:\n\n{\n  \"summary\": string,\n  \"detailed_explanation\": string,\n  \"confidence_score\": number,\n  \"reliability_score\": number,\n  \"detected_objects\": [{\"id\": string, \"object_type\": string, \"label\": string, \"confidence\": number, \"x\": number, \"y\": number, \"width\": number, \"height\": number, \"area\": number, \"metadata\": object}],\n  \"detected_changes\": [{\"id\": string, \"label\": string, \"magnitude\": number, \"description\": string}],\n  \"land_cover_result\": [{\"label\": string, \"percentage\": number, \"color\": string}],\n  \"area_measurements\": [{\"label\": string, \"value\": string, \"estimate\": boolean}],\n  \"recommendations\": string[],\n  \"evidence_data\": string[],\n  \"agent_steps\": [{\"id\": string, \"step_name\": string, \"step_order\": number, \"status\": \"completed\" | \"processing\" | \"queued\", \"description\": string, \"duration_ms\": number, \"metadata\": object}],\n  \"analysis_type\": \"${mode}\",\n  \"status\": \"completed\",\n  \"created_at\": string\n}\n\nMode: ${mode}\nQuery: ${query}\nImage count: ${images.length}`,
            },
            ...imagePayloads,
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`)
  }

  const json = (await response.json()) as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }

  const outputText =
    json.output_text ||
    json.output
      ?.map((item) => item.content?.map((contentItem) => contentItem.text).join('\n'))
      .join('\n') ||
    ''

  if (!outputText) {
    throw new Error('OpenAI response did not include extracted analysis content.')
  }

  const jsonMatch = outputText.match(/\{[\s\S]*\}/)
  const rawJson = jsonMatch ? jsonMatch[0] : outputText
  const parsed = JSON.parse(rawJson) as Partial<AnalysisResult>

  return normalizeAnalysisResult(parsed, mode, query, images)
}

export async function runAnalysis({
  mode,
  query,
  images,
}: {
  mode: AnalysisMode
  query: string
  images: UploadedImage[]
}): Promise<AnalysisResult> {
  if (analysisApiUrl) {
    try {
      return await callRemoteAnalysisApi({ mode, query, images })
    } catch (error) {
      console.warn('Remote analysis API failed, falling back to demo analysis.', error)
    }
  }

  if (openAiApiKey) {
    try {
      return await callOpenAiVisionApi({ mode, query, images })
    } catch (error) {
      console.warn('OpenAI analysis failed, falling back to demo analysis.', error)
    }
  }

  const { result } = await getDemoAnalysis({
    mode,
    query,
    images: images.map((image) => ({
      id: image.id,
      name: image.name,
      imageType: image.imageType,
    })),
  })

  return result
}

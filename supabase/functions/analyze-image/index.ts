import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const openAiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'

function extractJsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('No JSON object was found in the AI response.')
  }

  return JSON.parse(match[0]) as Record<string, unknown>
}

async function callOpenAi(payload: {
  mode: string
  query: string
  images: Array<{ id: string; name: string; imageType: string; localUrl: string }>
}) {
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY secret is not configured in Supabase Edge Function secrets.')
  }

  const imagePayloads = payload.images.map((image) => ({
    type: 'input_image',
    image_url: image.localUrl,
  }))

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
              text: `You are SatQuery AI, a remote sensing vision-language assistant. Analyze the provided image(s) for the request below and return valid JSON only with no markdown wrappers.\n\nMode: ${payload.mode}\nQuery: ${payload.query}\nImage count: ${payload.images.length}\n\nStructure:\n{\n  "summary": string,\n  "detailed_explanation": string,\n  "confidence_score": number,\n  "reliability_score": number,\n  "detected_objects": [{"id": string, "object_type": string, "label": string, "confidence": number, "x": number, "y": number, "width": number, "height": number, "area": number, "metadata": object}],\n  "detected_changes": [{"id": string, "label": string, "magnitude": number, "description": string}],\n  "land_cover_result": [{"label": string, "percentage": number, "color": string}],\n  "area_measurements": [{"label": string, "value": string, "estimate": boolean}],\n  "recommendations": string[],\n  "evidence_data": string[],\n  "agent_steps": [{"id": string, "step_name": string, "step_order": number, "status": "completed" | "processing" | "queued", "description": string, "duration_ms": number, "metadata": object}],\n  "analysis_type": string,\n  "status": "completed",\n  "created_at": string\n}`,
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

  const data = (await response.json()) as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }

  const outputText =
    data.output_text ||
    data.output
      ?.map((item) => item.content?.map((contentItem) => contentItem.text).join('\n'))
      .join('\n') ||
    ''

  if (!outputText) {
    throw new Error('OpenAI returned an empty response.')
  }

  return extractJsonObject(outputText)
}

async function storeAnalysisResult(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  payload: {
    analysis_type: string
    query: string
    summary: string
    detailed_explanation: string
    confidence_score: number
    reliability_score: number
    recommendations: string[]
    evidence_data: string[]
    detected_objects: unknown[]
    detected_changes: unknown[]
    land_cover_result: unknown[]
    area_measurements: unknown[]
    agent_steps: unknown[]
    created_at?: string
  },
) {
  if (!userId) {
    return null
  }

  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      analysis_name: `Live ${payload.analysis_type} analysis`,
      analysis_type: payload.analysis_type,
      query: payload.query,
      status: 'completed',
      confidence_score: payload.confidence_score,
      reliability_score: payload.reliability_score,
      summary: payload.summary,
      created_at: payload.created_at || new Date().toISOString(),
      completed_at: payload.created_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (analysisError || !analysis) {
    throw analysisError || new Error('Unable to create analysis record.')
  }

  const { error: aiResultError } = await supabase.from('ai_results').insert({
    analysis_id: analysis.id,
    summary: payload.summary,
    detailed_explanation: payload.detailed_explanation,
    confidence_score: payload.confidence_score,
    reliability_score: payload.reliability_score,
    detected_objects: payload.detected_objects,
    detected_changes: payload.detected_changes,
    land_cover_result: payload.land_cover_result,
    area_measurements: payload.area_measurements,
    recommendations: payload.recommendations,
    evidence_data: payload.evidence_data,
    created_at: payload.created_at || new Date().toISOString(),
  })

  if (aiResultError) {
    throw aiResultError
  }

  const agentStepsPayload = payload.agent_steps.map((step, index) => ({
    analysis_id: analysis.id,
    step_name: String((step as Record<string, unknown>).step_name || `Step ${index + 1}`),
    step_order: Number((step as Record<string, unknown>).step_order || index + 1),
    status: String((step as Record<string, unknown>).status || 'completed'),
    description: String((step as Record<string, unknown>).description || ''),
    duration_ms: Number((step as Record<string, unknown>).duration_ms || 0),
    metadata: (step as Record<string, unknown>).metadata || {},
    created_at: payload.created_at || new Date().toISOString(),
  }))

  if (agentStepsPayload.length) {
    const { error: stepsError } = await supabase.from('agent_steps').insert(agentStepsPayload)
    if (stepsError) {
      throw stepsError
    }
  }

  return analysis
}

serve(async (req) => {
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function environment.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = (await req.json()) as {
      mode?: string
      query?: string
      images?: Array<{ id: string; name: string; imageType: string; localUrl: string }>
    }

    const mode = body.mode || 'single'
    const query = body.query || ''
    const images = body.images || []

    if (!images.length) {
      return new Response(JSON.stringify({ error: 'At least one image is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const aiResultRaw = await callOpenAi({ mode, query, images })

    const normalizedResult = {
      id: String((aiResultRaw.id as string | undefined) || `analysis-${Date.now()}`),
      summary: String(aiResultRaw.summary || 'Analysis completed successfully.'),
      detailed_explanation: String(
        aiResultRaw.detailed_explanation || 'The live analysis completed successfully.',
      ),
      confidence_score: Number(aiResultRaw.confidence_score ?? 90),
      reliability_score: Number(aiResultRaw.reliability_score ?? 88),
      detected_objects: Array.isArray(aiResultRaw.detected_objects) ? aiResultRaw.detected_objects : [],
      detected_changes: Array.isArray(aiResultRaw.detected_changes) ? aiResultRaw.detected_changes : [],
      land_cover_result: Array.isArray(aiResultRaw.land_cover_result) ? aiResultRaw.land_cover_result : [],
      area_measurements: Array.isArray(aiResultRaw.area_measurements) ? aiResultRaw.area_measurements : [],
      recommendations: Array.isArray(aiResultRaw.recommendations) ? aiResultRaw.recommendations : [],
      evidence_data: Array.isArray(aiResultRaw.evidence_data) ? aiResultRaw.evidence_data : [],
      agent_steps: Array.isArray(aiResultRaw.agent_steps) ? aiResultRaw.agent_steps : [],
      analysis_type: String(aiResultRaw.analysis_type || mode),
      status: String(aiResultRaw.status || 'completed'),
      created_at: String(aiResultRaw.created_at || new Date().toISOString()),
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const authHeader = req.headers.get('Authorization') || ''
    let userId: string | null = null

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: userData, error: userError } = await supabase.auth.getUser(token)
      if (!userError && userData.user) {
        userId = userData.user.id
      }
    }

    const storedAnalysis = await storeAnalysisResult(supabase, userId, {
      analysis_type: normalizedResult.analysis_type,
      query,
      summary: normalizedResult.summary,
      detailed_explanation: normalizedResult.detailed_explanation,
      confidence_score: normalizedResult.confidence_score,
      reliability_score: normalizedResult.reliability_score,
      recommendations: normalizedResult.recommendations,
      evidence_data: normalizedResult.evidence_data,
      detected_objects: normalizedResult.detected_objects,
      detected_changes: normalizedResult.detected_changes,
      land_cover_result: normalizedResult.land_cover_result,
      area_measurements: normalizedResult.area_measurements,
      agent_steps: normalizedResult.agent_steps,
      created_at: normalizedResult.created_at,
    })

    return new Response(
      JSON.stringify({
        ok: true,
        result: normalizedResult,
        stored: Boolean(storedAnalysis),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred.'

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})

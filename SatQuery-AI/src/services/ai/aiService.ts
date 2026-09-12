import type { AnalysisMode, AnalysisResult, AnalysisStep } from '../../types'

export interface AIResponse {
  result: AnalysisResult
}

export type AIProvider = 'mock'

class MockAIService {
  async analyze({
    mode,
    query: _query,
    images,
  }: {
    mode: AnalysisMode
    query: string
    images: Array<{ id: string; name: string; imageType: string }> 
  }): Promise<AIResponse> {
    await new Promise((resolve) => setTimeout(resolve, 900))

    const demoObjectCount = Math.max(8, images.length * 6 + 10)
    const detectedObjects = Array.from({ length: demoObjectCount }, (_, index) => ({
      id: `obj-${index + 1}`,
      object_type: index % 3 === 0 ? 'building' : index % 3 === 1 ? 'water_body' : 'road',
      label: index % 3 === 0 ? 'Building' : index % 3 === 1 ? 'Water body' : 'Road',
      confidence: 82 + ((index * 7) % 18),
      x: 40 + (index % 6) * 10,
      y: 25 + ((index % 5) * 12),
      width: 10 + (index % 4) * 8,
      height: 8 + (index % 3) * 6,
      area: 0.3 + index * 0.12,
      metadata: { demo: true },
    }))

    const summaryByMode: Record<AnalysisMode, string> = {
      single: 'The image contains a mixed urban and agricultural landscape with several visible structures and water features.',
      'optical-sar': 'Optical imagery emphasizes surface texture and vegetation while SAR highlights structure and moisture patterns.',
      'before-after': 'The post-event image shows clear urban expansion and significant change in vegetation and water distribution.',
      change: 'Detected major changes include new construction, vegetation decline, and a small increase in water coverage.',
      object: 'The requested object classes are present, with highest confidence for buildings, roads, and water bodies.',
      'land-cover': 'The region is primarily agricultural, with urban and forest areas distributed across the western and eastern sectors.',
      disaster: 'Flood-affected zones are concentrated near low-lying terrain and river-adjacent settlements.',
      agriculture: 'Agricultural plots are visible, with several stressed areas suggesting possible irrigation or crop health issues.',
      'urban-growth': 'Urban expansion is evident through newly constructed blocks and extended road corridors.',
    }

    const explanationByMode: Record<AnalysisMode, string> = {
      single: 'The mock analysis combines visible spectral patterns, shape cues, and context from the image to infer likely land cover and objects. It is meant to demonstrate the SatQuery AI workflow rather than provide precision satellite measurements.',
      'optical-sar': 'Optical bands help interpret color and vegetation, while SAR helps distinguish built-up areas, moisture, and roughness under different illumination conditions.',
      'before-after': 'By comparing the two timestamps, the system highlights regions where the urban footprint, vegetation, and hydrology have changed significantly.',
      change: 'The change analysis compares before and after states and ranks altered areas based on visual intensity, structural movement, and coverage shifts.',
      object: 'Object extraction is based on a rule-based mock detector that identifies likely buildings, roads, water bodies, and vegetation patterns.',
      'land-cover': 'Land-cover classes are approximated using color, texture, and object density estimates and should be treated as a demo classification only.',
      disaster: 'The disaster module looks for low-lying flooded regions, damaged transport corridors, and settlements near water bodies.',
      agriculture: 'The agricultural monitor identifies field geometry, crop-like texture, and vegetation health patterns as an estimated interpretation.',
      'urban-growth': 'Urban growth inference combines the increase in built-up patches, road expansion, and densification around existing centers.',
    }

    const changeList = [
      { id: 'chg-1', label: 'Urban Expansion', magnitude: 12.8, description: 'New construction and road extension are visible in the north-west corridor.' },
      { id: 'chg-2', label: 'Vegetation Change', magnitude: -8.3, description: 'Several agricultural plots show reduced vigor and patchiness relative to the earlier image.' },
      { id: 'chg-3', label: 'Water Area', magnitude: 4.1, description: 'Water extent appears slightly increased in the central low-lying region.' },
    ]

    const landCover = [
      { label: 'Agriculture', percentage: 38.4, color: '#34d399' },
      { label: 'Forest', percentage: 24.2, color: '#22c55e' },
      { label: 'Urban', percentage: 18.7, color: '#60a5fa' },
      { label: 'Water', percentage: 9.3, color: '#38bdf8' },
      { label: 'Bare Land', percentage: 6.1, color: '#fbbf24' },
      { label: 'Roads', percentage: 3.3, color: '#a78bfa' },
    ]

    const recommendations = [
      'Monitor the newly changed urban region for further construction activity.',
      'Compare against a follow-up image after 30 days to validate growth trends.',
      'Verify detected construction areas using higher-resolution imagery.',
    ]

    const evidence = [
      'Detected building cluster in the northeastern sector.',
      'Water body expansion near the central river bend.',
      'Road extension corridor with reduced vegetation cover.',
    ]

    const agentSteps: AnalysisStep[] = [
      { id: 'step-1', step_name: 'Image Uploaded', step_order: 1, status: 'completed', description: 'Source image(s) have been received and validated.', duration_ms: 250 },
      { id: 'step-2', step_name: 'Image Preprocessing', step_order: 2, status: 'completed', description: 'Normalization and metadata extraction completed.', duration_ms: 300 },
      { id: 'step-3', step_name: 'Image Type Detection', step_order: 3, status: 'completed', description: 'Image mode identified as ' + mode, duration_ms: 180 },
      { id: 'step-4', step_name: 'Feature Extraction', step_order: 4, status: 'completed', description: 'Texture, color, and object descriptors extracted.', duration_ms: 420 },
      { id: 'step-5', step_name: 'Object / Change Detection', step_order: 5, status: 'completed', description: 'Mock detector identified likely objects and regions.', duration_ms: 530 },
      { id: 'step-6', step_name: 'Spatial Analysis', step_order: 6, status: 'completed', description: 'Area and region relationships estimated.', duration_ms: 350 },
      { id: 'step-7', step_name: 'AI Reasoning', step_order: 7, status: 'processing', description: 'Combining evidence with language interpretation.', duration_ms: 430 },
      { id: 'step-8', step_name: 'Evidence Generation', step_order: 8, status: 'queued', description: 'Preparing summaries, highlights, and recommendations.', duration_ms: 210 },
      { id: 'step-9', step_name: 'Confidence Estimation', step_order: 9, status: 'queued', description: 'Scoring reliability for the final answer.', duration_ms: 160 },
      { id: 'step-10', step_name: 'Final Answer', step_order: 10, status: 'queued', description: 'Assembling the response for the user.', duration_ms: 120 },
    ]

    return {
      result: {
        id: 'analysis-demo',
        summary: summaryByMode[mode] || 'The requested analysis has been completed using the demo AI layer.',
        detailed_explanation: explanationByMode[mode] || explanationByMode.single,
        confidence_score: 91,
        reliability_score: 86,
        detected_objects: detectedObjects,
        detected_changes: changeList,
        land_cover_result: landCover,
        area_measurements: [
          { label: 'Agricultural Area', value: '12.7 km²', estimate: true },
          { label: 'Water Area', value: '3.4 km²', estimate: true },
          { label: 'Urban Area', value: '8.9 km²', estimate: true },
        ],
        recommendations,
        evidence_data: evidence,
        agent_steps: agentSteps,
        analysis_type: mode,
        status: 'completed',
        demoMode: true,
        created_at: new Date().toISOString(),
      },
    }
  }
}

export const aiService = new MockAIService()

export const getDemoAnalysis = async ({
  mode,
  query,
  images,
}: {
  mode: AnalysisMode
  query: string
  images: Array<{ id: string; name: string; imageType: string }>
}): Promise<AIResponse> => {
  return aiService.analyze({ mode, query, images })
}

import type { ModelConfig, TaskType } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// SatQuery AI — Model Registry
// All specialist model adapters follow the RemoteSensingModel interface.
// Swap model endpoints or add new adapters without changing application code.
// ─────────────────────────────────────────────────────────────────────────────

const AI_BASE = import.meta.env.VITE_AI_BACKEND_URL || ''

export const MODEL_REGISTRY: Record<TaskType, ModelConfig> = {
  vqa: {
    id: 'vqa',
    name: 'Remote Sensing VQA Adapter',
    description: 'Visual Question Answering adapted for satellite and remote-sensing imagery using BigEarthNet-style domain adaptation.',
    supportedModalities: ['optical', 'multispectral', 'sar'],
    supportedModes: ['General'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/vqa` : '',
    enabled: true,
    fallbackId: 'captioning',
  },
  captioning: {
    id: 'captioning',
    name: 'Scene Captioning Adapter',
    description: 'Generates comprehensive scene descriptions including land cover, objects, and environmental context.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['General'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/caption` : '',
    enabled: true,
  },
  grounding: {
    id: 'grounding',
    name: 'Text-Guided Grounding Adapter',
    description: 'Locates and highlights objects described in natural language. Outputs bounding boxes and segmentation masks.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['General', 'Infrastructure'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/ground` : '',
    enabled: true,
  },
  change_detection: {
    id: 'change_detection',
    name: 'Bi-Temporal Change Detection Adapter',
    description: 'Detects and maps changes between two temporally separated satellite observations. Outputs change map, heatmap and statistics.',
    supportedModalities: ['optical', 'multispectral', 'sar'],
    supportedModes: ['Change', 'Disaster', 'Urban growth'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/change` : '',
    enabled: true,
  },
  optical_sar: {
    id: 'optical_sar',
    name: 'Optical-SAR Fusion Adapter',
    description: 'Fuses co-registered optical and SAR imagery to extract complementary structural and spectral information.',
    supportedModalities: ['optical', 'sar'],
    supportedModes: ['Optical + SAR'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/fusion` : '',
    enabled: true,
  },
  land_cover: {
    id: 'land_cover',
    name: 'Land Cover Classification Adapter',
    description: 'Classifies pixels into land cover categories: water, vegetation, built-up, bare land, agriculture, forest, roads, wetlands.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['General', 'Agriculture', 'Water', 'Forest'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/landcover` : '',
    enabled: true,
  },
  object_detection: {
    id: 'object_detection',
    name: 'Object Detection Adapter',
    description: 'Detects specific objects in satellite imagery: buildings, roads, vehicles, infrastructure.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['General', 'Infrastructure', 'Urban growth'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/detect` : '',
    enabled: true,
  },
  disaster: {
    id: 'disaster',
    name: 'Disaster Analysis Adapter',
    description: 'Specialized change detection tuned for disaster events: floods, fires, landslides, cyclone impact, infrastructure damage.',
    supportedModalities: ['optical', 'multispectral', 'sar'],
    supportedModes: ['Disaster'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/disaster` : '',
    enabled: true,
    fallbackId: 'change_detection',
  },
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture Monitoring Adapter',
    description: 'Analyzes crop area, vegetation health, field boundaries, and agricultural change over time.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['Agriculture'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/agriculture` : '',
    enabled: true,
    fallbackId: 'land_cover',
  },
  urban_growth: {
    id: 'urban_growth',
    name: 'Urban Growth Analysis Adapter',
    description: 'Detects new construction, built-up expansion, and urban sprawl between two dates.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['Urban growth'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/urban` : '',
    enabled: true,
    fallbackId: 'change_detection',
  },
  water_analysis: {
    id: 'water_analysis',
    name: 'Water Body Analysis Adapter',
    description: 'Detects water bodies, flood extents, temporal water dynamics, and surface water changes.',
    supportedModalities: ['optical', 'multispectral', 'sar'],
    supportedModes: ['Water', 'Disaster'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/water` : '',
    enabled: true,
    fallbackId: 'land_cover',
  },
  forest_monitoring: {
    id: 'forest_monitoring',
    name: 'Forest Monitoring Adapter',
    description: 'Estimates forest cover, detects deforestation or reforestation, and identifies burned areas.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['Forest'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/forest` : '',
    enabled: true,
    fallbackId: 'land_cover',
  },
  infrastructure: {
    id: 'infrastructure',
    name: 'Infrastructure Monitoring Adapter',
    description: 'Detects and monitors roads, buildings, bridges, and infrastructure changes.',
    supportedModalities: ['optical', 'multispectral'],
    supportedModes: ['Infrastructure'],
    endpoint: AI_BASE ? `${AI_BASE}/v1/infrastructure` : '',
    enabled: true,
    fallbackId: 'object_detection',
  },
}

export function getModel(task: TaskType): ModelConfig {
  return MODEL_REGISTRY[task]
}

export function getFallbackModel(task: TaskType): ModelConfig | null {
  const config = MODEL_REGISTRY[task]
  if (config.fallbackId) return MODEL_REGISTRY[config.fallbackId]
  return null
}

export function getModelsForMode(mode: string): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter((model) =>
    model.supportedModes.includes(mode as never) && model.enabled
  )
}

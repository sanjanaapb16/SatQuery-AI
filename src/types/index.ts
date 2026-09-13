export type AnalysisMode =
  | 'single'
  | 'optical-sar'
  | 'before-after'
  | 'change'
  | 'object'
  | 'land-cover'
  | 'disaster'
  | 'agriculture'
  | 'urban-growth'

export type ImageRole = 'original' | 'before' | 'after' | 'optical' | 'sar' | 'evidence' | 'result'

export interface UploadedImage {
  id: string
  name: string
  size: number
  type: string
  localUrl: string
  imageType: 'optical' | 'sar' | 'before' | 'after' | 'multispectral'
  uploadedAt: string
  width?: number
  height?: number
  latitude?: number
  longitude?: number
  zoom?: number
  regionName?: string
  geospatialSource?: 'manual' | 'auto' | 'none'
}

export interface AnalysisStep {
  id: string
  step_name: string
  step_order: number
  status: 'completed' | 'processing' | 'queued'
  description: string
  duration_ms: number
  metadata?: Record<string, unknown>
}

export interface DetectedObject {
  id: string
  object_type: string
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  area: number
  metadata?: Record<string, unknown>
}

export interface DetectedChange {
  id: string
  label: string
  magnitude: number
  description: string
}

export interface LandCoverResult {
  label: string
  percentage: number
  color: string
}

export interface AreaMeasurement {
  label: string
  value: string
  estimate?: boolean
}

export interface AnalysisResult {
  id: string
  summary: string
  detailed_explanation: string
  confidence_score: number
  reliability_score: number
  detected_objects: DetectedObject[]
  detected_changes: DetectedChange[]
  land_cover_result: LandCoverResult[]
  area_measurements: AreaMeasurement[]
  recommendations: string[]
  evidence_data: string[]
  agent_steps: AnalysisStep[]
  analysis_type: AnalysisMode
  status: 'completed' | 'processing'
  demoMode: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  full_name: string
  email: string
  organization: string
  avatar_url?: string
}

export interface AnalysisHistoryItem {
  id: string
  title: string
  question: string
  content: string
  created_at: string
  analysis_type: AnalysisMode
}

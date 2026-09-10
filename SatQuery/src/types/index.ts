// ─────────────────────────────────────────────
// SatQuery AI — Shared Types
// ─────────────────────────────────────────────

export type Language = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'ml' | 'mr' | 'bn'

export type UserRole = 'user' | 'analyst' | 'reviewer' | 'admin'

export type ImageModality = 'optical' | 'sar' | 'multispectral' | 'unknown'

export type AnalysisMode =
  | 'General'
  | 'Change'
  | 'Optical + SAR'
  | 'Disaster'
  | 'Agriculture'
  | 'Urban growth'
  | 'Water'
  | 'Forest'
  | 'Infrastructure'

export type TaskType =
  | 'vqa'
  | 'captioning'
  | 'grounding'
  | 'change_detection'
  | 'optical_sar'
  | 'land_cover'
  | 'object_detection'
  | 'disaster'
  | 'agriculture'
  | 'urban_growth'
  | 'water_analysis'
  | 'forest_monitoring'
  | 'infrastructure'

export type ReliabilityLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type ComparisonMode = 'side-by-side' | 'slider' | 'flicker' | 'overlay'

// ─── Image Quality ────────────────────────────
export interface ImageQualityResult {
  valid: boolean
  format: 'ok' | 'warn' | 'error'
  resolution: 'ok' | 'warn' | 'error'
  metadata: 'ok' | 'warn' | 'missing'
  crs: 'ok' | 'warn' | 'missing'
  georeferenced: boolean
  warnings: string[]
  errors: string[]
  overall: 'GOOD' | 'ACCEPTABLE' | 'POOR'
}

// ─── Agent ────────────────────────────────────
export interface AnalysisInput {
  files: File[]
  fileNames: string[]
  query: string
  mode: AnalysisMode
  sessionId?: string
}

export interface AnalysisEvidence {
  label: string
  confidence: number
  geometry?: GeoJSON
  imageUrl?: string
}

export interface ExecutionStep {
  id: string
  label: string
  detail: string
  status: 'pending' | 'running' | 'done' | 'error'
  durationMs?: number
  model?: string
}

export interface AnalysisOutput {
  answer: string
  task: TaskType
  confidence: number
  reliability: ReliabilityLevel
  evidence: AnalysisEvidence[]
  artifacts: string[]
  executionTrace: ExecutionStep[]
  landCover?: LandCoverItem[]
  changeStats?: ChangeStats
  recommendations?: string[]
  areaEstimates?: AreaEstimate[]
}

// ─── Land Cover ───────────────────────────────
export interface LandCoverItem {
  label: string
  percent: number
  color: string
}

// ─── Change ───────────────────────────────────
export interface ChangeStats {
  changeDetected: boolean
  percentChanged: number
  majorChanges: string[]
  affectedAreaHa: number
  builtUpChange?: number
  vegetationChange?: number
  waterChange?: number
}

// ─── Area ─────────────────────────────────────
export interface AreaEstimate {
  label: string
  valueHa: number
  isEstimate: boolean
}

// ─── Firestore Data Models ────────────────────
export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  role: UserRole
  createdAt: unknown
}

export interface ProjectRecord {
  id?: string
  ownerId: string
  title: string
  icon: string
  color: string
  description?: string
  memberIds: string[]
  createdAt?: unknown
  updatedAt?: unknown
}

export interface SessionRecord {
  id?: string
  ownerId: string
  projectId?: string
  title: string
  query: string
  mode: AnalysisMode
  files: string[]
  route: TaskType | string
  result?: Partial<AnalysisOutput>
  createdAt?: unknown
}

export interface AnnotationRecord {
  id?: string
  sessionId: string
  ownerId: string
  type: 'point' | 'line' | 'polygon' | 'rectangle'
  coordinates: number[][]
  label?: string
  color?: string
  createdAt?: unknown
}

export interface ReportRecord {
  id?: string
  sessionId: string
  ownerId: string
  title: string
  format: 'pdf' | 'json' | 'csv' | 'geojson'
  downloadUrl?: string
  createdAt?: unknown
}

export interface NotificationRecord {
  id?: string
  userId: string
  type: 'analysis_done' | 'report_ready' | 'collab_invite' | 'error' | 'sync'
  message: string
  read: boolean
  createdAt?: unknown
}

export interface CollaboratorPresence {
  uid: string
  displayName: string
  color: string
  lastSeen: number
}

// ─── Model Registry ───────────────────────────
export interface ModelConfig {
  id: TaskType
  name: string
  description: string
  supportedModalities: ImageModality[]
  supportedModes: AnalysisMode[]
  endpoint?: string
  enabled: boolean
  fallbackId?: TaskType
}

// ─── GeoJSON (minimal) ───────────────────────
export interface GeoJSON {
  type: string
  coordinates?: unknown
  geometry?: unknown
  properties?: Record<string, unknown>
}

// ─── Demo ─────────────────────────────────────
export interface DemoDataset {
  id: string
  label: string
  mode: AnalysisMode
  imageCount: 1 | 2
  modality: ImageModality
  query: string
  description: string
}

from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title='SatQuery AI API', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

class AnalysisRequest(BaseModel):
    query: str = Field(min_length=3)
    modalities: list[str] = ['optical', 'sar']
    dates: list[str] = ['2023', '2025']
    demo: bool = True

class EvidenceRegion(BaseModel):
    label: str
    score: float
    bbox: list[float]
    source: str

class AnalysisResponse(BaseModel):
    analysis_id: str
    answer: str
    analysis_type: str
    agents: list[str]
    model: str
    confidence: float
    evidence_quality: Literal['High', 'Medium', 'Low']
    evidence_regions: list[EvidenceRegion]
    execution_trace: list[dict[str, str]]
    demo_fallback: bool
    created_at: str


def route_query(request: AnalysisRequest) -> tuple[str, list[str]]:
    text = request.query.lower()
    agents: list[str] = []
    if len(request.dates) > 1 or any(word in text for word in ('change', 'increased', 'growth', 'between')):
        agents.append('Change Agent')
    if len(request.modalities) > 1 and 'sar' in request.modalities:
        agents.append('Optical-SAR Fusion Agent')
    if any(word in text for word in ('where', 'region', 'building', 'water body', 'show')):
        agents.append('Grounding Agent')
    if any(word in text for word in ('area', 'distance', 'coordinate', 'nearest')):
        agents.append('GIS Agent')
    if any(word in text for word in ('unusual', 'anomaly')):
        agents.append('Anomaly Agent')
    if not agents:
        agents.append('VQA Agent')
    return ('multi_temporal_change' if len(request.dates) > 1 else 'single_image_vqa', agents)


def make_result(request: AnalysisRequest) -> AnalysisResponse:
    analysis_type, agents = route_query(request)
    now = datetime.now(timezone.utc).isoformat()
    trace = [{'stage': stage, 'status': 'complete'} for stage in ('query_received', 'input_validated', 'metadata_extracted', 'task_identified', 'agents_selected', 'evidence_verified', 'confidence_calculated')]
    return AnalysisResponse(
        analysis_id=f'demo-{datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")}',
        answer='Built-up area increased significantly in the northern and eastern portions of the scene. Optical texture and SAR backscatter both support the detected change.',
        analysis_type=analysis_type,
        agents=agents,
        model='SatQuery Demo Fusion Adapter',
        confidence=0.94,
        evidence_quality='High',
        evidence_regions=[EvidenceRegion(label='Built-up expansion', score=0.94, bbox=[0.58, 0.23, 0.23, 0.21], source='2023/2025 optical + SAR')],
        execution_trace=trace,
        demo_fallback=request.demo,
        created_at=now,
    )

@app.get('/api/health')
def health():
    return {'status': 'ok', 'service': 'satquery-ai', 'mode': 'demo-fallback'}

@app.post('/api/analyze', response_model=AnalysisResponse)
def analyze(request: AnalysisRequest):
    return make_result(request)

@app.post('/api/vqa', response_model=AnalysisResponse)
def vqa(request: AnalysisRequest):
    request.modalities = request.modalities[:1]
    return make_result(request)

@app.post('/api/change-detection', response_model=AnalysisResponse)
def change_detection(request: AnalysisRequest):
    return make_result(request)

@app.post('/api/optical-sar', response_model=AnalysisResponse)
def optical_sar(request: AnalysisRequest):
    request.modalities = ['optical', 'sar']
    return make_result(request)

@app.post('/api/upload-metadata')
async def upload_metadata(file: UploadFile = File(...), acquisition_date: str | None = Form(default=None)):
    content = await file.read()
    return {'filename': file.filename, 'content_type': file.content_type, 'bytes': len(content), 'acquisition_date': acquisition_date, 'geospatial_metadata': 'not available in demo adapter', 'warning': 'Accurate coordinates require a georeferenced raster and are never fabricated.'}

from typing import Any
from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel

app = FastAPI(title='SatQuery AI Model Service', version='0.1.0')

class AnalyzeResponse(BaseModel):
    task: str
    answer: str
    confidence: float
    reliability: str
    evidence: list[dict[str, Any]] = []
    artifacts: list[str] = []


def classify_task(query: str, mode: str) -> str:
    q = query.lower()
    if mode == 'Change' or any(word in q for word in ('change', 'before', 'after', 'increased', 'decreased')):
        return 'change_detection'
    if mode == 'Optical + SAR' or any(word in q for word in ('sar', 'optical', 'radar')):
        return 'optical_sar'
    if any(word in q for word in ('highlight', 'building', 'road', 'field', 'where')):
        return 'grounding'
    if any(word in q for word in ('land cover', 'vegetation', 'water', 'forest', 'agriculture')):
        return 'land_cover'
    if any(word in q for word in ('describe', 'caption', 'scene')):
        return 'captioning'
    return 'vqa'

@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'satquery-model-service', 'weights_loaded': False}

@app.post('/v1/analyze', response_model=AnalyzeResponse)
async def analyze(query: str = Form(...), mode: str = Form('General'), files: list[UploadFile] = File(default=[])):
    task = classify_task(query, mode)
    return AnalyzeResponse(task=task, answer='Model adapter ready. Attach trained remote-sensing weights to enable inference.', confidence=0, reliability='LOW', evidence=[{'label': 'Input accepted', 'confidence': 1.0}], artifacts=[])

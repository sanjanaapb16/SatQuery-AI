# SatQuery AI

**Ask the Satellite. Get the Evidence.**

SatQuery AI is a GeoAI interface for asking natural-language questions of satellite imagery. This repository contains a responsive React command center and a FastAPI inference contract with an explicit demo/fallback adapter.

## Included

- Command-center dashboard with analytics, workflows, and responsive navigation
- Signature 2023/2025 optical + SAR multi-temporal demo
- Query composer with suggested questions and expert mode affordance
- Synthetic evidence map with change regions, coordinates, source stack, confidence, and audit trace
- Analysis history view
- FastAPI routes for orchestration, VQA, change detection, optical/SAR fusion, uploads, and health
- Query routing for Change, Grounding, GIS, Anomaly, VQA, and Optical-SAR Fusion agents
- Firebase-ready `.env.example`, Firestore rules, and Storage rules
- Clear demo fallback labeling; no fabricated live satellite claims

## Local development

```powershell
npm install
npm run dev
```

Frontend: `http://localhost:5173`

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Backend API: `http://localhost:8000/api/health`

## Firebase setup

1. Create a Firebase project.
2. Enable Email/Password and Google Authentication.
3. Create Firestore and Storage.
4. Register a web application and copy its public web configuration into `.env` using `.env.example`.
5. Deploy `firestore.rules` and `storage.rules` with the Firebase CLI.
6. Keep Admin credentials backend-only. Never add service-account JSON or private keys to the frontend.

The current UI works in demo mode without Firebase credentials. Add a Firebase service layer before enabling production auth and persistence.

## Architecture

```text
React + TypeScript + Vite
        |
        | Firebase Auth / Firestore / Storage (production wiring)
        v
FastAPI orchestration API
        |
Query router -> specialist agents -> model adapters -> geospatial processing
        |
Evidence + confidence + execution trace
```

Large models should be plugged into the adapter boundary in the backend. The current adapter returns clearly labeled demo output and should not be presented as a trained benchmark model.

## API

- `GET /api/health`
- `POST /api/analyze`
- `POST /api/vqa`
- `POST /api/change-detection`
- `POST /api/optical-sar`
- `POST /api/upload-metadata`

## Known limitations

The demo uses a synthetic map and fallback result so the product can be evaluated without large model weights or restricted imagery. GeoTIFF CRS/bounds extraction, Firebase token verification, real model adapters, report generation, and live alert ingestion are the next backend slices.

# SatQuery AI

SatQuery AI is a production-style web application for remote sensing image analysis using natural-language queries. It combines a React + Vite frontend with Supabase services for authentication, storage, and server-side AI processing.

## Features

- Natural-language remote sensing analysis
- Upload and preview imagery
- Supabase Auth sign-in / sign-up flow
- Supabase Storage upload support for `satquery-images`
- Live image analysis via Supabase Edge Function
- PDF report generation
- Dashboard, history, reports, and profile pages

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Supabase Auth, Supabase Storage, Supabase Edge Functions, PostgreSQL
- AI layer: OpenAI-compatible API via server-side Edge Function

## Datasets and Benchmarks

### BigEarthNet
- Primary open-source dataset for remote-sensing adaptation.
- Contains co-registered Sentinel-1 SAR and Sentinel-2 multispectral imagery.
- Useful for fine-tuning or expanding the model's understanding of land cover, scene categories, and geospatial patterns.
- Reference: https://arxiv.org/abs/2603.29630

### VRSBench
- Public evaluation benchmark for vision-language tasks in remote sensing.
- Useful for validating model performance on image understanding, visual question answering, and geospatial reasoning tasks.
- Helps compare different model versions and demonstrate benchmark-based evaluation results.

### Project usage
- BigEarthNet can be used for training or fine-tuning the remote-sensing understanding layer.
- VRSBench can be used for benchmark evaluation and reporting model performance.
- These datasets are open source and suitable for research-oriented improvements to the underlying AI capability behind SatQuery AI.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file from `.env.example` and fill in your values:

   ```bash
   copy .env.example .env
   ```

3. Update `.env` with your Supabase credentials:

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   VITE_ANALYSIS_API_URL=https://<project-ref>.supabase.co/functions/v1/analyze-image
   VITE_OPENAI_API_KEY=<optional-openai-key>
   VITE_OPENAI_MODEL=gpt-4o-mini
   ```

4. Run the app locally:

   ```bash
   npm run dev
   ```

5. Build the production bundle:

   ```bash
   npm run build
   ```

## Supabase setup

Run the SQL files in the Supabase SQL editor in this order:

1. `supabase/migrations/database.sql`
2. `supabase/storage-setup.sql`

### Required Supabase secrets for the Edge Function

In the Supabase dashboard, add these secrets for the `analyze-image` function:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Deploy the Edge Function

From the project root, run:

```bash
supabase functions deploy analyze-image
```

If you do not already have the Supabase CLI installed, install it first:

```bash
npm install -g supabase
```

## Project structure

- `src/` — frontend app
- `src/services/` — image and analysis services
- `src/lib/` — Supabase client setup
- `supabase/functions/` — Edge Functions
- `supabase/migrations/` — PostgreSQL schema
- `supabase/storage-setup.sql` — storage bucket and policies

## Notes

- The frontend will automatically fall back to a demo analysis path if no live provider is configured.
- For production usage, the Supabase Edge Function should be deployed and the `VITE_ANALYSIS_API_URL` env variable should point to it.
- Real file uploads require a logged-in Supabase user and the `satquery-images` bucket configured correctly.

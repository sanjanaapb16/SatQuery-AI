create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  organization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  image_type text not null check (image_type in ('optical', 'sar', 'before', 'after', 'multispectral')),
  file_size integer,
  mime_type text,
  width integer,
  height integer,
  latitude double precision,
  longitude double precision,
  acquisition_date timestamptz,
  sensor text,
  created_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_name text not null,
  analysis_type text not null,
  query text,
  status text not null default 'queued',
  confidence_score numeric(5,2),
  reliability_score numeric(5,2),
  summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.analysis_images (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  image_id uuid not null references public.images(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_questions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text,
  confidence_score numeric(5,2),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_results (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  summary text,
  detailed_explanation text,
  confidence_score numeric(5,2),
  reliability_score numeric(5,2),
  detected_objects jsonb,
  detected_changes jsonb,
  land_cover_result jsonb,
  area_measurements jsonb,
  recommendations jsonb,
  evidence_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.detected_objects (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  object_type text not null,
  label text not null,
  confidence numeric(5,2),
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  area numeric,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  step_name text not null,
  step_order integer not null,
  status text not null default 'queued',
  description text,
  duration_ms integer,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_images_user_id on public.images(user_id);
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analysis_images_analysis_id on public.analysis_images(analysis_id);
create index if not exists idx_analysis_questions_analysis_id on public.analysis_questions(analysis_id);
create index if not exists idx_agent_steps_analysis_id on public.agent_steps(analysis_id);
create index if not exists idx_reports_user_id on public.reports(user_id);

alter table public.profiles enable row level security;
alter table public.images enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_images enable row level security;
alter table public.analysis_questions enable row level security;
alter table public.ai_results enable row level security;
alter table public.detected_objects enable row level security;
alter table public.agent_steps enable row level security;
alter table public.reports enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own profile" on public.profiles
  for delete using (auth.uid() = user_id);

create policy "Users can view own images" on public.images
  for select using (auth.uid() = user_id);

create policy "Users can insert own images" on public.images
  for insert with check (auth.uid() = user_id);

create policy "Users can update own images" on public.images
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own images" on public.images
  for delete using (auth.uid() = user_id);

create policy "Users can view own analyses" on public.analyses
  for select using (auth.uid() = user_id);

create policy "Users can insert own analyses" on public.analyses
  for insert with check (auth.uid() = user_id);

create policy "Users can update own analyses" on public.analyses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own analyses" on public.analyses
  for delete using (auth.uid() = user_id);

create policy "Users can view own analysis_images" on public.analysis_images
  for select using (
    exists (
      select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can insert own analysis_images" on public.analysis_images
  for insert with check (
    exists (
      select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can update own analysis_images" on public.analysis_images
  for update using (
    exists (
      select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can delete own analysis_images" on public.analysis_images
  for delete using (
    exists (
      select 1 from public.analyses a where a.id = analysis_images.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can view own analysis_questions" on public.analysis_questions
  for select using (auth.uid() = user_id);

create policy "Users can insert own analysis_questions" on public.analysis_questions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own analysis_questions" on public.analysis_questions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own analysis_questions" on public.analysis_questions
  for delete using (auth.uid() = user_id);

create policy "Users can view own ai_results" on public.ai_results
  for select using (
    exists (
      select 1 from public.analyses a where a.id = ai_results.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can insert own ai_results" on public.ai_results
  for insert with check (
    exists (
      select 1 from public.analyses a where a.id = ai_results.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can update own ai_results" on public.ai_results
  for update using (
    exists (
      select 1 from public.analyses a where a.id = ai_results.analysis_id and a.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a where a.id = ai_results.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can delete own ai_results" on public.ai_results
  for delete using (
    exists (
      select 1 from public.analyses a where a.id = ai_results.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can view own detected_objects" on public.detected_objects
  for select using (
    exists (
      select 1 from public.analyses a where a.id = detected_objects.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can insert own detected_objects" on public.detected_objects
  for insert with check (
    exists (
      select 1 from public.analyses a where a.id = detected_objects.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can update own detected_objects" on public.detected_objects
  for update using (
    exists (
      select 1 from public.analyses a where a.id = detected_objects.analysis_id and a.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a where a.id = detected_objects.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can delete own detected_objects" on public.detected_objects
  for delete using (
    exists (
      select 1 from public.analyses a where a.id = detected_objects.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can view own agent_steps" on public.agent_steps
  for select using (
    exists (
      select 1 from public.analyses a where a.id = agent_steps.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can insert own agent_steps" on public.agent_steps
  for insert with check (
    exists (
      select 1 from public.analyses a where a.id = agent_steps.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can update own agent_steps" on public.agent_steps
  for update using (
    exists (
      select 1 from public.analyses a where a.id = agent_steps.analysis_id and a.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a where a.id = agent_steps.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can delete own agent_steps" on public.agent_steps
  for delete using (
    exists (
      select 1 from public.analyses a where a.id = agent_steps.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "Users can view own reports" on public.reports
  for select using (auth.uid() = user_id);

create policy "Users can insert own reports" on public.reports
  for insert with check (auth.uid() = user_id);

create policy "Users can update own reports" on public.reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own reports" on public.reports
  for delete using (auth.uid() = user_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.handle_updated_at();

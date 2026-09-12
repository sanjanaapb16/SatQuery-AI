-- Run this in the Supabase SQL editor.
-- This creates the storage bucket expected by the app and adds the needed policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'satquery-images',
  'satquery-images',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/tiff', 'image/tif', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/tiff', 'image/tif', 'image/webp'];

drop policy if exists "Public read access for satquery-images" on storage.objects;
drop policy if exists "Authenticated users can upload satquery-images" on storage.objects;
drop policy if exists "Authenticated users can update own satquery-images" on storage.objects;
drop policy if exists "Authenticated users can delete own satquery-images" on storage.objects;

create policy "Public read access for satquery-images"
on storage.objects
for select
using (bucket_id = 'satquery-images');

create policy "Authenticated users can upload satquery-images"
on storage.objects
for insert
with check (
  bucket_id = 'satquery-images'
  and auth.role() = 'authenticated'
);

create policy "Authenticated users can update own satquery-images"
on storage.objects
for update
using (
  bucket_id = 'satquery-images'
  and auth.uid() = owner
)
with check (
  bucket_id = 'satquery-images'
  and auth.uid() = owner
);

create policy "Authenticated users can delete own satquery-images"
on storage.objects
for delete
using (
  bucket_id = 'satquery-images'
  and auth.uid() = owner
);

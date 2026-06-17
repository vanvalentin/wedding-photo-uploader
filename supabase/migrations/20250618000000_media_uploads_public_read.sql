-- Allow guests to browse all registered uploads on the public gallery page
create policy "Anyone can read media uploads"
  on public.media_uploads
  for select
  to anon, authenticated
  using (true);

create index if not exists media_uploads_taken_at_idx
  on public.media_uploads (taken_at desc nulls last, uploaded_at desc);

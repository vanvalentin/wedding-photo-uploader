-- Curated gallery items selected by the hosts (references Google Drive files)
create table public.curated_gallery (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  caption text,
  sort_order integer not null default 0,
  is_video boolean not null default false,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index curated_gallery_sort_order_idx on public.curated_gallery (sort_order asc, taken_at desc nulls last);

alter table public.curated_gallery enable row level security;

create policy "Anyone can read curated gallery"
  on public.curated_gallery
  for select
  to anon, authenticated
  using (true);

comment on table public.curated_gallery is 'Host-curated wedding photos/videos from Google Drive';

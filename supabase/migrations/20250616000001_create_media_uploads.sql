-- Registry of all guest uploads (populated after each successful upload)
create table public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  file_name text not null,
  guest_name text,
  mime_type text,
  is_video boolean not null default false,
  file_size bigint,
  taken_at timestamptz,
  uploaded_at timestamptz not null default now()
);

create index media_uploads_uploaded_at_idx on public.media_uploads (uploaded_at desc);
create index media_uploads_file_name_idx on public.media_uploads (file_name);

alter table public.media_uploads enable row level security;

comment on table public.media_uploads is 'All guest uploads registered after Drive upload completes';

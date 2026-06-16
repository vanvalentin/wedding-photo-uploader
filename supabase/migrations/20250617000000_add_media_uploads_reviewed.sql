-- Track whether host has reviewed each upload in admin
alter table public.media_uploads
  add column if not exists reviewed boolean not null default false;

create index if not exists media_uploads_reviewed_idx
  on public.media_uploads (reviewed, uploaded_at desc);

comment on column public.media_uploads.reviewed is 'Set true in admin after the host has reviewed the upload';

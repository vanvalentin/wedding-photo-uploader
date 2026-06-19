-- Track the backing object store for each media item.
-- Existing Google Drive rows are backfilled to provider/key pairs so new R2
-- uploads can coexist with the original Drive-based gallery.

alter table public.media_uploads
  add column storage_provider text not null default 'google_drive',
  add column storage_key text;

update public.media_uploads
set storage_key = drive_file_id
where storage_key is null;

alter table public.media_uploads
  alter column storage_key set not null,
  add constraint media_uploads_storage_provider_check
    check (storage_provider in ('google_drive', 'r2'));

create unique index media_uploads_storage_identity_idx
  on public.media_uploads (storage_provider, storage_key);

alter table public.curated_gallery
  add column storage_provider text not null default 'google_drive',
  add column storage_key text;

update public.curated_gallery
set storage_key = drive_file_id
where storage_key is null;

alter table public.curated_gallery
  alter column storage_key set not null,
  add constraint curated_gallery_storage_provider_check
    check (storage_provider in ('google_drive', 'r2'));

create unique index curated_gallery_storage_identity_idx
  on public.curated_gallery (storage_provider, storage_key);

comment on column public.media_uploads.storage_provider is 'Object storage provider: google_drive or r2';
comment on column public.media_uploads.storage_key is 'Provider-specific file ID or object key';
comment on column public.curated_gallery.storage_provider is 'Object storage provider: google_drive or r2';
comment on column public.curated_gallery.storage_key is 'Provider-specific file ID or object key';

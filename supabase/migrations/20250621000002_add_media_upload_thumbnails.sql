-- Store optional pre-generated thumbnail objects for R2-backed media.
-- Google Drive rows can continue to use Drive's native thumbnail endpoint.

alter table public.media_uploads
  add column thumbnail_storage_provider text,
  add column thumbnail_storage_key text,
  add column thumbnail_mime_type text,
  add column thumbnail_file_size bigint;

alter table public.media_uploads
  add constraint media_uploads_thumbnail_storage_provider_check
    check (
      thumbnail_storage_provider is null
      or thumbnail_storage_provider in ('google_drive', 'r2')
    ),
  add constraint media_uploads_thumbnail_storage_pair_check
    check (
      (thumbnail_storage_provider is null and thumbnail_storage_key is null)
      or (thumbnail_storage_provider is not null and thumbnail_storage_key is not null)
    );

create index media_uploads_thumbnail_storage_idx
  on public.media_uploads (thumbnail_storage_provider, thumbnail_storage_key)
  where thumbnail_storage_key is not null;

comment on column public.media_uploads.thumbnail_storage_provider is 'Provider that stores the generated thumbnail object';
comment on column public.media_uploads.thumbnail_storage_key is 'Provider-specific object key for the generated thumbnail';
comment on column public.media_uploads.thumbnail_mime_type is 'MIME type of the generated thumbnail object';
comment on column public.media_uploads.thumbnail_file_size is 'Size in bytes of the generated thumbnail object';

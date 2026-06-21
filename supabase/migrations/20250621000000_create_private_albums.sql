-- Password-protected photo albums for specific guests (e.g. photobooth photos)

CREATE TABLE private_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX private_albums_slug_idx ON private_albums (slug);

CREATE TABLE private_album_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES private_albums(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  storage_provider text NOT NULL DEFAULT 'r2',
  storage_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  is_video boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (album_id, storage_provider, storage_key)
);

CREATE INDEX private_album_items_album_id_idx ON private_album_items (album_id);
CREATE INDEX private_album_items_sort_idx ON private_album_items (album_id, sort_order);

ALTER TABLE private_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_album_items ENABLE ROW LEVEL SECURITY;

-- No public access — all reads/writes go through the server with the secret key
CREATE POLICY "No public access to private_albums"
  ON private_albums FOR ALL
  USING (false);

CREATE POLICY "No public access to private_album_items"
  ON private_album_items FOR ALL
  USING (false);

-- Remove password requirement; albums are accessed via unique link only

ALTER TABLE private_albums DROP COLUMN IF EXISTS password_hash;

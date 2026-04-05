-- Add the missing 'filter' column to 'photo_metadata' table
ALTER TABLE photo_metadata ADD COLUMN IF NOT EXISTS filter TEXT;

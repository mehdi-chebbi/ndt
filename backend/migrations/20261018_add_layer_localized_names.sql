-- Additive, idempotent localization migration.
-- Safe for the production database: no existing column is renamed, changed,
-- dropped, or overwritten. Existing names remain the fallback values.
BEGIN;

-- Do not wait indefinitely for a production schema lock. If the tables are
-- busy for more than five seconds, PostgreSQL aborts and the transaction
-- leaves the schema unchanged; rerun during a quieter window.
SET LOCAL lock_timeout = '5s';

ALTER TABLE layer_groups
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_fr TEXT;

ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_name_fr VARCHAR(255);

COMMIT;

-- Read-only verification (expected result: six rows).
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'layer_groups' AND column_name IN ('name_en', 'name_fr', 'description_en', 'description_fr'))
    OR
    (table_name = 'layers' AND column_name IN ('display_name_en', 'display_name_fr'))
  )
ORDER BY table_name, column_name;

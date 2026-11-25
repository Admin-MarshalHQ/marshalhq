-- Apply before deploying the per-booking review form. Existing clients may
-- keep using the old form. Roll back the app while retaining this wider index:
-- restoring the old uniqueness would reject legitimate sibling reviews.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = public, pg_catalog;
CREATE UNIQUE INDEX IF NOT EXISTS "Review_shiftId_authorId_subjectId_direction_key"
  ON "Review" ("shiftId", "authorId", "subjectId", "direction");

-- A pre-existing object with this name must actually enforce the intended key.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = 'public."Review"'::regclass
      AND i.indexrelid = 'public."Review_shiftId_authorId_subjectId_direction_key"'::regclass
      AND i.indisunique AND i.indisvalid AND i.indisready
      AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnatts = 4
      AND ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY AS keys(n, pos)
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = keys.n ORDER BY keys.pos)
          = ARRAY['shiftId','authorId','subjectId','direction']
  ) THEN RAISE EXCEPTION 'Per-booking review index differs from expected definition'; END IF;
END $$;
DROP INDEX IF EXISTS "Review_shiftId_authorId_direction_key";
COMMIT;

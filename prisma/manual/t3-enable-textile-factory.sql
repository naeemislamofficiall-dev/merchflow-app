DO $$
DECLARE n integer;
BEGIN
  UPDATE "Factory" SET "factoryType" = 'TEXTILE' WHERE "code" = 'F01';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'No factory with this code. Fix the code in the SQL file.';
  END IF;
END $$;
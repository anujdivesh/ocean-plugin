-- Ensure gem_user exists before applying ownership changes in the dump
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'gem_user') THEN
    CREATE ROLE gem_user WITH LOGIN PASSWORD 'P@ssword123';
  ELSE
    ALTER ROLE gem_user WITH PASSWORD 'P@ssword123';
  END IF;
END
$$;

-- Additive: existing city records remain unchanged (the new field defaults to NULL).
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS civitatis_widget_code text;

COMMENT ON COLUMN public.cities.civitatis_widget_code IS
  'Official Civitatis activities embed for this city, shown only in Revista / Tours.';

ALTER TABLE public.cities
  ADD CONSTRAINT cities_civitatis_widget_code_length
  CHECK (civitatis_widget_code IS NULL OR char_length(civitatis_widget_code) <= 50000);

-- The current city UPDATE policy is public, and profile roles are user-editable.
-- Snapshot the existing administrators into a private, non-client-writable roster
-- instead of trusting a self-edited profile.role for this executable embed setting.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.city_widget_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE private.city_widget_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.city_widget_admins FROM PUBLIC, anon, authenticated;
INSERT INTO private.city_widget_admins (user_id)
SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION private.guard_city_civitatis_widget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.civitatis_widget_code IS NOT DISTINCT FROM OLD.civitatis_widget_code THEN
      RETURN NEW;
    END IF;
  ELSIF COALESCE(NEW.civitatis_widget_code, '') = '' THEN
    RETURN NEW;
  END IF;

  IF (auth.jwt() ->> 'role') = 'service_role'
    OR (auth.uid() IS NULL AND current_setting('role', true) IN ('none', 'postgres', 'supabase_admin'))
    OR (auth.uid() IS NOT NULL AND (
      (auth.jwt() -> 'app_metadata' ->> 'isAdmin') = 'true'
      OR EXISTS (
        SELECT 1 FROM private.city_widget_admins a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.user_id = auth.uid() AND p.role = 'admin'
      )
    ))
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Solo administradores autorizados pueden modificar el widget Civitatis.'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION private.guard_city_civitatis_widget() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER cities_guard_civitatis_widget
  BEFORE INSERT OR UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION private.guard_city_civitatis_widget();

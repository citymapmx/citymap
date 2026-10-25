-- Explicit deny policy for the private server-managed administrator roster.
-- The trigger reads it as its owner; browser roles have neither table grants nor a permissive policy.
CREATE POLICY city_widget_admins_no_client_access
ON private.city_widget_admins FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

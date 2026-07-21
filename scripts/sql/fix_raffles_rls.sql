-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Business owners can insert raffles." ON "raffles";
DROP POLICY IF EXISTS "Business owners can update own raffles." ON "raffles";
DROP POLICY IF EXISTS "Business owners can delete own raffles." ON "raffles";

-- Permitir a cualquier usuario autenticado (como tú, el admin) crear, editar y borrar sorteos.
CREATE POLICY "Authenticated users can insert raffles." 
ON "raffles" FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update raffles." 
ON "raffles" FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete raffles." 
ON "raffles" FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Activar RLS en las tablas principales
-- (Asegúrate de que los nombres de tus tablas coincidan. Si tienes tablas con otros nombres, cámbialos aquí)

ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_claims" ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- POLÍTICAS PARA "reviews"
----------------------------------------------------
-- 1. Cualquiera puede leer reseñas
CREATE POLICY "Public reviews are viewable by everyone." 
ON "reviews" FOR SELECT USING (true);

-- 2. Solo usuarios autenticados pueden insertar reseñas
CREATE POLICY "Authenticated users can insert reviews." 
ON "reviews" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Solo el creador puede actualizar o borrar su propia reseña
CREATE POLICY "Users can update own reviews." 
ON "reviews" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews." 
ON "reviews" FOR DELETE 
USING (auth.uid() = user_id);

----------------------------------------------------
-- POLÍTICAS PARA "businesses" (Negocios)
----------------------------------------------------
-- 1. Cualquiera puede ver los negocios
CREATE POLICY "Public businesses are viewable by everyone." 
ON "businesses" FOR SELECT USING (true);

-- 2. Usuarios autenticados pueden insertar negocios (Ej. sugerir un negocio)
CREATE POLICY "Users can suggest businesses." 
ON "businesses" FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Solo el creador original O el dueño (dueño reclamado) pueden actualizar
-- Nota: Si en tu base de datos el creador se llama 'user_id', úsalo. 
-- Si tienes un 'owner_id', añade: OR auth.uid() = owner_id
CREATE POLICY "Users can update own businesses." 
ON "businesses" FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = owner_id);

CREATE POLICY "Users can delete own businesses." 
ON "businesses" FOR DELETE 
USING (auth.uid() = user_id);

----------------------------------------------------
-- POLÍTICAS PARA "events" (Eventos)
----------------------------------------------------
CREATE POLICY "Public events are viewable by everyone." 
ON "events" FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert events." 
ON "events" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events." 
ON "events" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events." 
ON "events" FOR DELETE 
USING (auth.uid() = user_id);

----------------------------------------------------
-- POLÍTICAS PARA "business_claims" (Reclamos)
----------------------------------------------------
CREATE POLICY "Users can insert claims." 
ON "business_claims" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Solo pueden ver sus propios reclamos o los administradores (aquí asumo que ves los de todos desde el panel admin bypassando RLS o siendo superusuario)
CREATE POLICY "Users can view own claims." 
ON "business_claims" FOR SELECT 
USING (auth.uid() = user_id);

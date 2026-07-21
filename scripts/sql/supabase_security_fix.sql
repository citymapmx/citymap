-- Activar Seguridad a Nivel de Fila (RLS) en todas las tablas principales
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- POLÍTICAS PARA NEGOCIOS (businesses)
-- --------------------------------------------------------

-- 1. Cualquier persona (incluso sin iniciar sesión) puede VER los negocios
CREATE POLICY "Public can view businesses" 
ON public.businesses FOR SELECT 
USING (true);

-- 2. Solo los usuarios autenticados pueden INSERTAR (sugerir) nuevos negocios
CREATE POLICY "Authenticated users can insert businesses" 
ON public.businesses FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Solo el creador original puede ACTUALIZAR un negocio
CREATE POLICY "Owners can update their businesses" 
ON public.businesses FOR UPDATE 
USING (auth.uid() = owner_id);

-- 4. Solo el creador original puede ELIMINAR un negocio
CREATE POLICY "Owners can delete their businesses" 
ON public.businesses FOR DELETE 
USING (auth.uid() = owner_id);

-- --------------------------------------------------------
-- POLÍTICAS PARA EVENTOS (events)
-- --------------------------------------------------------

-- 1. Cualquier persona puede VER los eventos
CREATE POLICY "Public can view events" 
ON public.events FOR SELECT 
USING (true);

-- 2. Solo usuarios autenticados pueden INSERTAR eventos
CREATE POLICY "Authenticated users can insert events" 
ON public.events FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Solo el creador puede ACTUALIZAR su evento
CREATE POLICY "Owners can update their events" 
ON public.events FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Solo el creador puede ELIMINAR su evento
CREATE POLICY "Owners can delete their events" 
ON public.events FOR DELETE 
USING (auth.uid() = user_id);

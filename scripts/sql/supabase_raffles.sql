-- ==============================================================
-- 1. TABLA: raffles (Sorteos)
-- ==============================================================
CREATE TABLE IF NOT EXISTS "raffles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "biz_id" UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "prize" TEXT NOT NULL,
    "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "raffles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public raffles are viewable by everyone." 
ON "raffles" FOR SELECT USING (true);

-- Solo el dueño o creador del negocio puede insertar sorteos (suponiendo owner_id)
-- o superusuarios (admin)
CREATE POLICY "Business owners can insert raffles." 
ON "raffles" FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = biz_id 
        AND (user_id = auth.uid() OR owner_id = auth.uid())
    )
);

CREATE POLICY "Business owners can update own raffles." 
ON "raffles" FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = biz_id 
        AND (user_id = auth.uid() OR owner_id = auth.uid())
    )
);

CREATE POLICY "Business owners can delete own raffles." 
ON "raffles" FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = biz_id 
        AND (user_id = auth.uid() OR owner_id = auth.uid())
    )
);

-- ==============================================================
-- 2. TABLA: raffle_participants (Participantes de Sorteos)
-- ==============================================================
CREATE TABLE IF NOT EXISTS "raffle_participants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "raffle_id" UUID NOT NULL REFERENCES "raffles"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL, -- references auth.users(id)
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("raffle_id", "user_id") -- Un usuario solo puede participar 1 vez
);

ALTER TABLE "raffle_participants" ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver a los participantes (o al menos la app necesita contar)
CREATE POLICY "Public can view participants." 
ON "raffle_participants" FOR SELECT USING (true);

-- Usuarios autenticados solo pueden registrarse a sí mismos
CREATE POLICY "Users can participate." 
ON "raffle_participants" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden cancelar su participación
CREATE POLICY "Users can un-participate." 
ON "raffle_participants" FOR DELETE 
USING (auth.uid() = user_id);

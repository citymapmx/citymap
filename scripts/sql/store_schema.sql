-- 1. EXTENSION DE UUID (si no está activa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS
CREATE TABLE public.store_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.store_product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.store_products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('single', 'multiple')),
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.store_option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_id UUID REFERENCES public.store_product_options(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    extra_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SEGURIDAD (RLS)
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_option_values ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "Public read categories" ON public.store_categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON public.store_products FOR SELECT USING (true);
CREATE POLICY "Public read options" ON public.store_product_options FOR SELECT USING (true);
CREATE POLICY "Public read values" ON public.store_option_values FOR SELECT USING (true);

-- Escritura solo para el dueño del negocio
CREATE POLICY "Owner write categories" ON public.store_categories FOR ALL 
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Owner write products" ON public.store_products FOR ALL 
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Owner write options" ON public.store_product_options FOR ALL 
USING (EXISTS (SELECT 1 FROM public.store_products p JOIN public.businesses b ON p.business_id = b.id WHERE p.id = product_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.store_products p JOIN public.businesses b ON p.business_id = b.id WHERE p.id = product_id AND b.owner_id = auth.uid()));

CREATE POLICY "Owner write values" ON public.store_option_values FOR ALL 
USING (EXISTS (SELECT 1 FROM public.store_product_options o JOIN public.store_products p ON o.product_id = p.id JOIN public.businesses b ON p.business_id = b.id WHERE o.id = option_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.store_product_options o JOIN public.store_products p ON o.product_id = p.id JOIN public.businesses b ON p.business_id = b.id WHERE o.id = option_id AND b.owner_id = auth.uid()));

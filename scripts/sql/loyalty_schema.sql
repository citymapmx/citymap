-- 1. loyalty_cards
CREATE TABLE IF NOT EXISTS public.loyalty_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    biz_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    bg_color TEXT,
    text_color TEXT,
    primary_color TEXT,
    reward_text TEXT,
    stamps_required INTEGER DEFAULT 5,
    logo_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. loyalty_members
CREATE TABLE IF NOT EXISTS public.loyalty_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    biz_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stamps INTEGER DEFAULT 0,
    wallet_pass_added BOOLEAN DEFAULT false,
    last_stamp_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_members_biz_user_idx ON public.loyalty_members (biz_id, user_id);

-- 3. loyalty_stamps_log
CREATE TABLE IF NOT EXISTS public.loyalty_stamps_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    biz_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
    action TEXT, -- "add", "remove", "redeem"
    amount INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_stamps_log ENABLE ROW LEVEL SECURITY;

-- Policies para loyalty_cards
CREATE POLICY "Public can view loyalty cards" ON public.loyalty_cards FOR SELECT USING (active = true);
CREATE POLICY "Owners can manage loyalty cards" ON public.loyalty_cards FOR ALL USING (
    biz_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

-- Policies para loyalty_members
CREATE POLICY "Users can view their own memberships" ON public.loyalty_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owners can view their members" ON public.loyalty_members FOR SELECT USING (
    biz_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Users can create their own membership" ON public.loyalty_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can update members" ON public.loyalty_members FOR UPDATE USING (
    biz_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Owners can delete members" ON public.loyalty_members FOR DELETE USING (
    biz_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

-- Policies para loyalty_stamps_log
CREATE POLICY "Owners can insert stamp logs" ON public.loyalty_stamps_log FOR INSERT WITH CHECK (
    biz_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Owners can view stamp logs" ON public.loyalty_stamps_log FOR SELECT USING (
    biz_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);


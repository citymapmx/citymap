-- Run before deploying the advertising toggle in the banner editor.
-- Existing banners remain unlabelled until an administrator classifies them.
alter table public.banners
  add column if not exists is_advertisement boolean not null default false;
comment on column public.banners.is_advertisement is
  'Display the Publicidad label on paid banners; false for CityMap notices.';
notify pgrst, 'reload schema';

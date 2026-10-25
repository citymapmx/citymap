-- Nullable until an owner saves the kind; allows existing browser choices to migrate once.
alter table public.businesses add column if not exists is_catalog boolean;
comment on column public.businesses.is_catalog is 'Digital store presentation: true=catalog, false=food menu, null=legacy preference not yet saved.';

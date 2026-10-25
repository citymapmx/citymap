-- Promotion settings share the product's existing owner/admin permissions.
-- The normal product price remains unchanged; sale_price applies only during its schedule.
alter table public.store_products
  add column if not exists promotion jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.store_products'::regclass and conname='store_products_promotion_object') then
    alter table public.store_products add constraint store_products_promotion_object
      check (jsonb_typeof(promotion) = 'object');
  end if;
end $$;

-- Run once in Supabase SQL Editor. Existing inventory data is preserved.
begin;
create table if not exists public.inventory_templates (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80),
 columns text[] not null check (
   cardinality(columns) between 1 and 5
   and columns <@ array['name','model','code','count1','count2']::text[]
   and array_position(columns,null) is null
 ),
 created_at timestamptz not null default now(),
 unique(user_id,name)
);
alter table public.inventory_templates enable row level security;
drop policy if exists templates_owner on public.inventory_templates;
create policy templates_owner on public.inventory_templates for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.inventory_templates from anon;
grant select,insert,update,delete on public.inventory_templates to authenticated;
commit;

-- Run once in Supabase > SQL Editor. Each signed-in user owns their inventory sessions.
create table if not exists public.inventory_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 120),
 source_file text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.inventory_items (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.inventory_sessions(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 500),
 code text not null check (length(trim(code)) between 1 and 200),
 count1 numeric check (count1 >= 0 and count1 <= 1000000000000),
 count2 numeric check (count2 >= 0 and count2 <= 1000000000000),
 position integer not null,
 unique(session_id,position)
);
create index if not exists inventory_sessions_owner on public.inventory_sessions(user_id,created_at desc);
alter table public.inventory_sessions enable row level security;
alter table public.inventory_items enable row level security;
drop policy if exists sessions_owner on public.inventory_sessions;
create policy sessions_owner on public.inventory_sessions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists items_owner on public.inventory_items;
create policy items_owner on public.inventory_items for all to authenticated
 using(exists(select 1 from public.inventory_sessions s where s.id=session_id and s.user_id=(select auth.uid())))
 with check(exists(select 1 from public.inventory_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
grant select,insert,update,delete on public.inventory_sessions,public.inventory_items to authenticated;
revoke all on public.inventory_sessions,public.inventory_items from anon;
create or replace function public.create_inventory_session(session_name text,source_file text,item_rows jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(item_rows) is distinct from 'array' then raise exception 'Invalid item list'; end if;
 if jsonb_array_length(item_rows) not between 1 and 20000 then raise exception 'Invalid row count'; end if;
 insert into public.inventory_sessions(name,source_file) values(session_name,source_file) returning id into new_id;
 insert into public.inventory_items(session_id,name,code,count1,count2,position)
 select new_id,x.name,x.code,x.count1,x.count2,x.position
 from jsonb_to_recordset(item_rows) as x(name text,code text,count1 numeric,count2 numeric,position integer);
 return new_id;
end; $$;
revoke all on function public.create_inventory_session(text,text,jsonb) from public,anon;
grant execute on function public.create_inventory_session(text,text,jsonb) to authenticated;

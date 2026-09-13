-- Add optional model without removing existing inventory data.
begin;
alter table public.inventory_items add column if not exists model text check (length(model) <= 200);
create or replace function public.create_inventory_session(session_name text,source_file text,item_rows jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(item_rows) is distinct from 'array' then raise exception 'Invalid item list'; end if;
 if jsonb_array_length(item_rows) not between 1 and 20000 then raise exception 'Invalid row count'; end if;
 insert into public.inventory_sessions(name,source_file) values(session_name,source_file) returning id into new_id;
 insert into public.inventory_items(session_id,name,model,code,count1,count2,position)
 select new_id,x.name,nullif(trim(x.model),''),x.code,x.count1,x.count2,x.position
 from jsonb_to_recordset(item_rows) as x(name text,model text,code text,count1 numeric,count2 numeric,position integer);
 return new_id;
end; $$;
revoke all on function public.create_inventory_session(text,text,jsonb) from public,anon;
grant execute on function public.create_inventory_session(text,text,jsonb) to authenticated;

commit;

-- Adds an admin-only way to list users together with their email address.
-- Run this once in the Supabase Dashboard SQL Editor.
--
-- We do NOT add an `email` column to public.profiles, because that table
-- is readable by every authenticated user (member list, ouen member
-- picker, etc.) and would leak everyone's email address. Instead this
-- function joins profiles with auth.users (only readable server-side)
-- and refuses to return anything unless the caller is an admin.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  name text,
  job text,
  area text,
  message text,
  op integer,
  menus jsonb,
  avatar_url text,
  is_admin boolean,
  created_at timestamptz,
  email text
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select p.id, p.name, p.job, p.area, p.message, p.op, p.menus,
         p.avatar_url, p.is_admin, p.created_at, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

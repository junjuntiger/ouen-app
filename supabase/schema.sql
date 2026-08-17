-- OUEN-APP Supabase schema
-- Run this once in the Supabase Dashboard SQL Editor (Project > SQL Editor > New query).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  job text not null default '',
  area text not null default '',
  message text not null default '',
  op integer not null default 0,
  menus jsonb not null default '[]'::jsonb,
  is_admin boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id),
  to_user_id uuid not null references public.profiles(id),
  menu_name text not null,
  items jsonb not null default '[]'::jsonb,
  price integer not null,
  paid integer not null,
  op integer not null default 0,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_from_user_id_idx on public.transactions(from_user_id);
create index if not exists transactions_to_user_id_idx on public.transactions(to_user_id);
create index if not exists transactions_created_at_idx on public.transactions(created_at desc);

-- Helper: is the currently authenticated user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Atomically create an ouen transaction and credit OP to the recipient.
-- Runs as SECURITY DEFINER so it can update another user's profile row,
-- something a plain client-side RLS-guarded UPDATE cannot do.
create or replace function public.create_ouen_transaction(
  p_to_user_id uuid,
  p_menu_name text,
  p_items jsonb,
  p_price integer,
  p_paid integer,
  p_message text
)
returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_op integer := greatest(p_paid - p_price, 0);
  v_tx public.transactions;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.transactions (from_user_id, to_user_id, menu_name, items, price, paid, op, message)
  values (auth.uid(), p_to_user_id, p_menu_name, p_items, p_price, p_paid, v_op, p_message)
  returning * into v_tx;

  if v_op > 0 then
    update public.profiles set op = op + v_op where id = p_to_user_id;
  end if;

  return v_tx;
end;
$$;

grant execute on function public.create_ouen_transaction(uuid, text, jsonb, integer, integer, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

-- profiles: anyone signed in can read all profiles (member list / timeline names),
-- can only create their own row, and can update their own row (or any row if admin).
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- transactions: anyone signed in can read all transactions (public timeline / admin view).
-- No direct INSERT policy: writes only happen through create_ouen_transaction().
-- Only admins can delete.
create policy "transactions_select_all" on public.transactions
  for select to authenticated using (true);

create policy "transactions_delete_admin" on public.transactions
  for delete to authenticated using (is_admin());

-- Profile photo storage: a public bucket where each user may only write
-- inside their own "{uid}/..." folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

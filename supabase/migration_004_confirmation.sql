-- Adds a confirmation step before OP is credited.
-- Run this once in the Supabase Dashboard SQL Editor.
--
-- Previously create_ouen_transaction() credited OP to the recipient
-- immediately, trusting the payer's self-reported "paid" amount with no
-- verification. Now a transaction starts as 'pending' and OP is only
-- credited once the recipient explicitly confirms via
-- confirm_ouen_transaction().

alter table public.transactions
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'received'));

alter table public.transactions
  add column if not exists confirmed_at timestamptz;

-- Transactions now start as 'pending' and do NOT credit OP up front.
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

  insert into public.transactions
    (from_user_id, to_user_id, menu_name, items, price, paid, op, message, status)
  values
    (auth.uid(), p_to_user_id, p_menu_name, p_items, p_price, p_paid, v_op, p_message, 'pending')
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Only the recipient (to_user_id) may confirm their own pending transaction.
-- Confirming credits OP exactly once (guarded by the pending -> received
-- status check, so re-running this can't double-credit).
create or replace function public.confirm_ouen_transaction(p_transaction_id uuid)
returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_tx public.transactions;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id;

  if v_tx is null then
    raise exception 'transaction not found';
  end if;
  if v_tx.to_user_id != auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_tx.status != 'pending' then
    raise exception 'transaction is not pending';
  end if;

  update public.transactions
    set status = 'received', confirmed_at = now()
    where id = p_transaction_id
    returning * into v_tx;

  if v_tx.op > 0 then
    update public.profiles set op = op + v_tx.op where id = v_tx.to_user_id;
  end if;

  return v_tx;
end;
$$;

grant execute on function public.confirm_ouen_transaction(uuid) to authenticated;

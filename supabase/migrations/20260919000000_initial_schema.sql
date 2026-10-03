-- SplitSense / FinLit initial Supabase schema. Apply with: supabase db push
create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  join_code text not null unique check (join_code ~ '^FLAT-[A-F0-9]{8}$'),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  role text not null default 'member' check (role in ('admin', 'member')),
  device_id text not null,
  recovery_code_hash text not null,
  avatar text,
  is_active boolean not null default true,
  current_joined_at timestamptz not null default now(),
  membership_periods jsonb not null default '[]'::jsonb,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (room_id, device_id)
);
alter table public.rooms add constraint rooms_created_by_fkey foreign key (created_by) references public.members(id) on delete set null;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  paid_by uuid not null references public.members(id),
  amount numeric(12,2) not null check (amount > 0),
  description text not null default 'Shared Expense',
  category text not null default 'Other',
  participants jsonb not null default '[]'::jsonb,
  split_type text not null default 'equal' check (split_type in ('equal', 'exact', 'percentage')),
  expense_scope text not null default 'shared' check (expense_scope in ('shared', 'personal')),
  notes text not null default '', receipt_url text not null default '',
  source text not null default 'quick', client_expense_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique nulls not distinct (room_id, client_expense_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_member uuid not null references public.members(id),
  to_member uuid not null references public.members(id),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'UPI', notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null, amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Other', paid_by uuid not null references public.members(id),
  participants jsonb not null default '[]'::jsonb,
  frequency text not null default 'monthly' check (frequency in ('weekly', 'monthly')),
  next_due_at timestamptz not null, is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists members_room_active_idx on public.members(room_id, is_active);
create index if not exists expenses_room_created_idx on public.expenses(room_id, created_at desc);
create index if not exists settlements_room_created_idx on public.settlements(room_id, created_at desc);
create index if not exists recurring_expenses_room_due_idx on public.recurring_expenses(room_id, next_due_at);

-- Clients only call the Edge Function. This avoids exposing room data through PostgREST.
alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.recurring_expenses enable row level security;

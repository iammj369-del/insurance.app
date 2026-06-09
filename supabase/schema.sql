create extension if not exists "pgcrypto";

create table if not exists public.vehicle_insurances (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references auth.users(id) on delete cascade,
  vehicle_type text not null,
  owner_name text not null,
  finance_company_name text,
  owner_mobile text not null,
  vehicle_reg_no text not null,
  vehicle_model_name text not null,
  vehicle_company_name text not null,
  insurance_company_name text,
  fc_expiry_date date,
  insurance_expiry_date date,
  policy_issued_date date,
  permit_expiry_date date,
  invoice_amount numeric default 0,
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid')),
  invoice_pdf_url text,
  proof_files jsonb not null default '[]'::jsonb,
  vehicle_image_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manager_id, vehicle_reg_no)
);

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  mobile text,
  email text,
  profile_picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insurance_agents (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  mobile text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.vehicle_insurances
add column if not exists insurance_agent_id uuid references public.insurance_agents(id) on delete set null;

alter table public.vehicle_insurances enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.insurance_agents enable row level security;

create policy "Admins manage their vehicle insurance records"
on public.vehicle_insurances
for all
using (auth.uid() = manager_id)
with check (auth.uid() = manager_id);

create policy "Admins manage their profile"
on public.admin_profiles
for all
using (auth.uid() = manager_id)
with check (auth.uid() = manager_id);

create policy "Admins manage their insurance agents"
on public.insurance_agents
for all
using (auth.uid() = manager_id)
with check (auth.uid() = manager_id);

insert into storage.buckets (id, name, public)
values
  ('insurance-invoices', 'insurance-invoices', true),
  ('customer-proofs', 'customer-proofs', true),
  ('vehicle-images', 'vehicle-images', true),
  ('admin-profiles', 'admin-profiles', true)
on conflict (id) do nothing;

create policy "Admins upload insurance invoices"
on storage.objects
for insert
with check (bucket_id = 'insurance-invoices' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins read insurance invoices"
on storage.objects
for select
using (bucket_id = 'insurance-invoices');

create policy "Admins delete insurance invoices"
on storage.objects
for delete
using (bucket_id = 'insurance-invoices' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins upload customer proof pdfs"
on storage.objects
for insert
with check (bucket_id = 'customer-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins read customer proof pdfs"
on storage.objects
for select
using (bucket_id = 'customer-proofs');

create policy "Admins delete customer proof pdfs"
on storage.objects
for delete
using (bucket_id = 'customer-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins upload vehicle proof images"
on storage.objects
for insert
with check (bucket_id = 'vehicle-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins read vehicle proof images"
on storage.objects
for select
using (bucket_id = 'vehicle-images');

create policy "Admins delete vehicle proof images"
on storage.objects
for delete
using (bucket_id = 'vehicle-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins upload profile pictures"
on storage.objects
for insert
with check (bucket_id = 'admin-profiles' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins read profile pictures"
on storage.objects
for select
using (bucket_id = 'admin-profiles');

create policy "Admins delete profile pictures"
on storage.objects
for delete
using (bucket_id = 'admin-profiles' and auth.uid()::text = (storage.foldername(name))[1]);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vehicle_insurances_updated_at on public.vehicle_insurances;
create trigger set_vehicle_insurances_updated_at
before update on public.vehicle_insurances
for each row execute function public.set_updated_at();

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version integer not null,
  title text not null,
  content_md text not null,
  published boolean not null default true,
  effective_date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);

grant select on public.legal_documents to anon;
grant select, insert, update on public.legal_documents to authenticated;
grant all on public.legal_documents to service_role;

alter table public.legal_documents enable row level security;

create policy "legal_documents_public_read"
  on public.legal_documents for select
  using (published = true);

create policy "legal_documents_staff_read"
  on public.legal_documents for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy "legal_documents_admin_insert"
  on public.legal_documents for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "legal_documents_admin_update"
  on public.legal_documents for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger legal_documents_updated_at
  before update on public.legal_documents
  for each row execute function public.update_updated_at_column();

alter table public.reservations
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists contract_accepted_at timestamptz,
  add column if not exists vexatious_accepted_at timestamptz,
  add column if not exists terms_version integer,
  add column if not exists contract_version integer;
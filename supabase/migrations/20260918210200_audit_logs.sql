-- Fase 0: audit log untuk tindakan penting (perubahan role, dsb).
-- Hanya bisa diisi lewat fungsi SECURITY DEFINER - tidak ada policy INSERT
-- untuk client, sehingga catatan tidak bisa dipalsukan dari sisi aplikasi.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Immutable dari sisi client. Hanya diisi oleh fungsi SECURITY DEFINER.';

alter table public.audit_logs enable row level security;

-- Admin & Super Admin dapat melihat sesuai permission masing-masing.
-- Super Admin tetap READ-ONLY: tidak ada policy insert/update/delete untuk
-- role apa pun (termasuk admin) di tabel ini.
create policy "audit_logs_select_admin_and_super_admin"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

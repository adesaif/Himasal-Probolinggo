-- Fase 0: extension dasar + helper generik yang dipakai lintas tabel.
-- Tidak menyentuh data/skema apa pun di project Supabase lain.

create extension if not exists "pgcrypto" with schema extensions;

-- Trigger generik untuk menjaga kolom updated_at tetap akurat.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

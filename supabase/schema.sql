-- ============================================================
-- Registro de peso — esquema de base de datos (Supabase)
-- Ejecutar completo en: SQL Editor -> New query
-- ============================================================

-- ============ TABLAS ============

-- Perfil del usuario (la contraseña vive en Supabase Auth, no aquí)
create table public.users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name    text not null,
  height  numeric(3,2) check (height between 0.50 and 2.50), -- metros; opcional hasta que el usuario la rellene
  target  numeric(5,2) check (target > 0)                    -- peso objetivo en kg; opcional
);

create table public.weight_target (
  weight_target_id bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid()
                references public.users (user_id) on delete cascade,
  init_date     date not null,
  end_date      date not null,
  target_weight numeric(5,2) not null check (target_weight > 0),
  check (end_date >= init_date)
);

create table public.weight_record (
  record_id bigint generated always as identity primary key,
  user_id   uuid not null default auth.uid()
            references public.users (user_id) on delete cascade,
  date      date not null,                       -- se recibe como 'yyyy-mm-dd'
  weight    numeric(5,2) not null check (weight > 0),
  imc       numeric(5,2),
  waist     numeric(5,1),
  thigh     numeric(5,1),
  chest     numeric(5,1),
  arm       numeric(5,1)
);

create index weight_record_user_date_idx
  on public.weight_record (user_id, date desc);

-- Tabla mínima para el keep-alive
create table public.keep_alive (id int primary key);
insert into public.keep_alive values (1);

-- ============ PERFIL AUTOMÁTICO ============
-- Al crear un usuario en Authentication se crea su fila en public.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (user_id, name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ PERMISOS ============
grant select, update                  on public.users         to authenticated;
grant select, insert, update, delete  on public.weight_record to authenticated;
grant select, insert, update, delete  on public.weight_target to authenticated;
grant select                          on public.keep_alive    to anon;

-- ============ RLS ============
alter table public.users         enable row level security;
alter table public.weight_record enable row level security;
alter table public.weight_target enable row level security;
alter table public.keep_alive    enable row level security;

create policy "users: ver el propio" on public.users
  for select to authenticated using (user_id = (select auth.uid()));

create policy "users: editar el propio" on public.users
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "records: solo los propios" on public.weight_record
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "targets: solo los propios" on public.weight_target
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "keep_alive: lectura pública" on public.keep_alive
  for select to anon using (true);

-- ============ ALTA DE UN USUARIO ============
-- Crea el usuario en Authentication -> Users: su perfil se genera solo
-- (nombre = parte del correo antes de la @). Después puedes ajustar el nombre,
-- la altura y el peso objetivo desde "Mi cuenta" en la app.

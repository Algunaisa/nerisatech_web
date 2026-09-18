-- Analítica anónima del portafolio. Ejecutar en Supabase SQL Editor.
-- No agregues una service_role key al frontend: sólo se usa la publishable/anon key.

create extension if not exists pgcrypto;

create table if not exists public.portfolio_visitante (
  id uuid primary key,
  fecha_primera_visita timestamptz not null default now(),
  fecha_ultima_visita timestamptz,
  primera_fuente text
);

create table if not exists public.portfolio_sesion (
  id uuid primary key default gen_random_uuid(),
  id_visitante uuid not null references public.portfolio_visitante(id) on delete restrict,
  inicio timestamptz not null default now(),
  ultima_actividad timestamptz,
  pagina_entrada text,
  pagina_salida text,
  referrer text,
  pais text,
  codigo_pais varchar(2),
  region text,
  ciudad text,
  idioma_navegador text,
  tipo_dispositivo text,
  sistema_operativo text,
  navegador text,
  ancho_pantalla integer check (ancho_pantalla is null or ancho_pantalla between 1 and 20000),
  alto_pantalla integer check (alto_pantalla is null or alto_pantalla between 1 and 20000),
  -- Secreto efímero: limita los heartbeats a quien creó la sesión.
  token_actividad uuid not null default gen_random_uuid()
);

create table if not exists public.portfolio_evento (
  id uuid primary key default gen_random_uuid(),
  id_sesion uuid not null references public.portfolio_sesion(id) on delete cascade,
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('PAGE_VIEW', 'VER_PIRINOLA', 'VER_CODIGO_PIRINOLA', 'VER_RUPESTRALIA', 'VER_SPACE_ROSES', 'DESCARGAR_CV', 'VER_GITHUB', 'VER_LINKEDIN', 'VER_ITCHIO', 'SCROLL_50', 'SCROLL_90')),
  pagina text,
  elemento text,
  detalle jsonb
);

create index if not exists portfolio_sesion_id_visitante_idx on public.portfolio_sesion (id_visitante);
create index if not exists portfolio_sesion_inicio_idx on public.portfolio_sesion (inicio desc);
create index if not exists portfolio_evento_id_sesion_idx on public.portfolio_evento (id_sesion);
create index if not exists portfolio_evento_fecha_idx on public.portfolio_evento (fecha desc);
create index if not exists portfolio_evento_tipo_idx on public.portfolio_evento (tipo);

alter table public.portfolio_visitante enable row level security;
alter table public.portfolio_sesion enable row level security;
alter table public.portfolio_evento enable row level security;

revoke all on public.portfolio_visitante, public.portfolio_sesion, public.portfolio_evento from anon, authenticated;

-- El rol se toma exclusivamente de app_metadata, que el cliente no puede modificar.
create or replace function public.es_admin_analitica()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'portfolio_analytics_admin';
$$;

revoke all on function public.es_admin_analitica() from public;
grant execute on function public.es_admin_analitica() to authenticated;

-- El navegador no puede leer las tablas. Sólo el administrador autenticado puede consultarlas.
-- El GRANT permite la operación; RLS la restringe estrictamente al rol de app_metadata.
grant select on public.portfolio_visitante, public.portfolio_sesion, public.portfolio_evento to authenticated;
create policy "analytics_admin_read_visitantes" on public.portfolio_visitante
  for select to authenticated using (public.es_admin_analitica());
create policy "analytics_admin_read_sesiones" on public.portfolio_sesion
  for select to authenticated using (public.es_admin_analitica());
create policy "analytics_admin_read_eventos" on public.portfolio_evento
  for select to authenticated using (public.es_admin_analitica());

-- Inserción append-only de eventos. No hay UPDATE, DELETE ni SELECT para visitantes anónimos.
grant insert on public.portfolio_evento to anon;
create policy "analytics_anon_insert_eventos" on public.portfolio_evento
  for insert to anon with check (id_sesion is not null and tipo is not null);

-- Crea/actualiza únicamente lo indispensable mediante RPC con SECURITY DEFINER.
create or replace function public.iniciar_sesion_portafolio(
  p_visitante_id uuid,
  p_pagina_entrada text,
  p_referrer text,
  p_datos_tecnicos jsonb default '{}'::jsonb,
  p_ubicacion jsonb default '{}'::jsonb
)
returns table (id_sesion uuid, token_actividad uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid := gen_random_uuid();
  v_token uuid := gen_random_uuid();
begin
  if p_visitante_id is null then raise exception 'visitante inválido'; end if;
  if length(coalesce(p_pagina_entrada, '')) > 500 or length(coalesce(p_referrer, '')) > 2000 then raise exception 'datos inválidos'; end if;
  insert into portfolio_visitante (id, fecha_ultima_visita, primera_fuente)
  values (p_visitante_id, now(), nullif(left(p_referrer, 2000), ''))
  on conflict (id) do update set fecha_ultima_visita = excluded.fecha_ultima_visita;

  insert into portfolio_sesion (
    id, id_visitante, ultima_actividad, pagina_entrada, referrer, pais, codigo_pais, region, ciudad,
    idioma_navegador, tipo_dispositivo, sistema_operativo, navegador, ancho_pantalla, alto_pantalla, token_actividad
  ) values (
    v_session_id, p_visitante_id, now(), nullif(left(p_pagina_entrada, 500), ''), nullif(left(p_referrer, 2000), ''),
    nullif(left(p_ubicacion ->> 'pais', 120), ''), nullif(upper(left(p_ubicacion ->> 'codigo_pais', 2)), ''),
    nullif(left(p_ubicacion ->> 'region', 160), ''), nullif(left(p_ubicacion ->> 'ciudad', 160), ''),
    nullif(left(p_datos_tecnicos ->> 'idioma_navegador', 35), ''), nullif(left(p_datos_tecnicos ->> 'tipo_dispositivo', 30), ''),
    nullif(left(p_datos_tecnicos ->> 'sistema_operativo', 30), ''), nullif(left(p_datos_tecnicos ->> 'navegador', 30), ''),
    case when coalesce(p_datos_tecnicos ->> 'ancho_pantalla', '') ~ '^\\d{1,5}$' then (p_datos_tecnicos ->> 'ancho_pantalla')::integer end,
    case when coalesce(p_datos_tecnicos ->> 'alto_pantalla', '') ~ '^\\d{1,5}$' then (p_datos_tecnicos ->> 'alto_pantalla')::integer end, v_token
  );
  return query select v_session_id, v_token;
end;
$$;

create or replace function public.actualizar_actividad_portafolio(
  p_sesion_id uuid,
  p_token_actividad uuid,
  p_pagina_salida text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sesion_id is null or p_token_actividad is null then raise exception 'sesión inválida'; end if;
  update portfolio_sesion
     set ultima_actividad = now(),
         pagina_salida = case when p_pagina_salida is null then pagina_salida else nullif(left(p_pagina_salida, 500), '') end
   where id = p_sesion_id and token_actividad = p_token_actividad;
end;
$$;

revoke all on function public.iniciar_sesion_portafolio(uuid, text, text, jsonb, jsonb) from public;
revoke all on function public.actualizar_actividad_portafolio(uuid, uuid, text) from public;
grant execute on function public.iniciar_sesion_portafolio(uuid, text, text, jsonb, jsonb) to anon;
grant execute on function public.actualizar_actividad_portafolio(uuid, uuid, text) to anon;

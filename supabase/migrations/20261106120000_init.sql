-- Gerador de Facas — 0001 schema base
-- Autorização: RLS do Postgres por pertencer à org. Nomes escolhidos para não colidir
-- com tabelas de outros apps que possam existir no mesmo projeto.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- orgs ----------------------------------------------------------------------
create table public.orgs (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(trim(nome)) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger orgs_updated before update on public.orgs
  for each row execute function public.set_updated_at();

-- org_members -----------------------------------------------------------------
create table public.org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  papel       text not null default 'member' check (papel in ('admin','member')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id);
create trigger org_members_updated before update on public.org_members
  for each row execute function public.set_updated_at();

create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_members where org_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_members
                 where org_id = p_org and user_id = auth.uid() and papel = 'admin');
$$;

-- Toda org precisa de pelo menos um admin (não deixa rebaixar/remover o último).
-- Exceção: quando a própria org está sendo apagada (cascade).
create or replace function public.keep_one_admin() returns trigger
language plpgsql set search_path = '' as $$
declare
  restantes int;
begin
  if old.papel <> 'admin' then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and new.papel = 'admin' then return new; end if;
  if not exists (select 1 from public.orgs where id = old.org_id) then return coalesce(new, old); end if;
  select count(*) into restantes from public.org_members
   where org_id = old.org_id and papel = 'admin' and id <> old.id;
  if restantes = 0 then
    raise exception 'A organização precisa de pelo menos um administrador.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger org_members_keep_admin before update or delete on public.org_members
  for each row execute function public.keep_one_admin();

-- box_models (catálogo global; a geometria vive no código) --------------------
create table public.box_models (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome        text not null,
  categoria   text not null check (categoria in ('caixa','display','sacola','transporte','tampa','alca','gaveta','especial')),
  entradas    text[] not null default array['largura','altura','profundidade'],
  enabled     boolean not null default false,   -- true só após protótipo físico aprovado
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index box_models_enabled_idx on public.box_models (enabled, ordem);
create trigger box_models_updated before update on public.box_models
  for each row execute function public.set_updated_at();

-- materials -------------------------------------------------------------------
create table public.materials (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs(id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 80),
  gramatura_g   int check (gramatura_g between 50 and 1500),
  espessura_mm  numeric(4,3) not null check (espessura_mm between 0.1 and 3),
  arquivado     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index materials_org_nome_uq on public.materials (org_id, lower(nome));
create index materials_org_idx on public.materials (org_id, arquivado);
create trigger materials_updated before update on public.materials
  for each row execute function public.set_updated_at();

-- dielines (facas salvas) -----------------------------------------------------
create table public.dielines (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs(id) on delete cascade,
  created_by       uuid default auth.uid() references auth.users(id) on delete set null,
  model_slug       text not null references public.box_models(slug) on update cascade on delete restrict,
  nome             text not null check (length(trim(nome)) between 1 and 120),
  largura_mm       numeric(7,2) not null check (largura_mm > 0 and largura_mm < 2000),
  altura_mm        numeric(7,2) not null check (altura_mm > 0 and altura_mm < 2000),
  profundidade_mm  numeric(7,2) not null check (profundidade_mm > 0 and profundidade_mm < 2000),
  material_id      uuid references public.materials(id) on delete set null,
  espessura_mm     numeric(4,3) not null check (espessura_mm between 0.1 and 3),
  sangria          boolean not null default false,
  areas_cola       boolean not null default false,
  opcoes           jsonb not null default '{}',
  os_numero        text check (os_numero is null or length(os_numero) <= 20),
  cliente          text check (cliente is null or length(cliente) <= 80),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index dielines_org_updated_idx on public.dielines (org_id, updated_at desc);
create index dielines_org_os_idx on public.dielines (org_id, os_numero);
create index dielines_model_idx on public.dielines (model_slug);
create index dielines_material_idx on public.dielines (material_id);
create index dielines_created_by_idx on public.dielines (created_by);
create trigger dielines_updated before update on public.dielines
  for each row execute function public.set_updated_at();

-- org e autor não mudam depois de criados; material tem que ser da mesma org
create or replace function public.dielines_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.org_id := old.org_id;
    new.created_by := old.created_by;
  end if;
  if new.material_id is not null and not exists (
    select 1 from public.materials m where m.id = new.material_id and m.org_id = new.org_id
  ) then
    raise exception 'Material de outra organização.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger dielines_guard before insert or update on public.dielines
  for each row execute function public.dielines_guard();

-- exports (cada download gerado) ----------------------------------------------
create table public.exports (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs(id) on delete cascade,
  dieline_id    uuid references public.dielines(id) on delete set null,  -- histórico sobrevive
  model_slug    text not null references public.box_models(slug) on update cascade on delete restrict,
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  spec          jsonb not null,
  motor_versao  text not null,
  filename      text not null,
  storage_path  text not null unique,
  bbox_w_mm     numeric(7,2) not null check (bbox_w_mm > 0),
  bbox_h_mm     numeric(7,2) not null check (bbox_h_mm > 0),
  papel         text not null check (papel in ('A4','A3','A2','A1','A0','Plotter')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index exports_org_created_idx on public.exports (org_id, created_at desc);
create index exports_dieline_idx on public.exports (dieline_id);
create index exports_model_idx on public.exports (model_slug);
create index exports_created_by_idx on public.exports (created_by, created_at desc);
create trigger exports_updated before update on public.exports
  for each row execute function public.set_updated_at();

-- RLS ---------------------------------------------------------------------------
alter table public.orgs         enable row level security;
alter table public.org_members  enable row level security;
alter table public.box_models   enable row level security;
alter table public.materials    enable row level security;
alter table public.dielines     enable row level security;
alter table public.exports      enable row level security;

create policy orgs_read   on public.orgs for select to authenticated using (public.is_member(id));
create policy orgs_update on public.orgs for update to authenticated using (public.is_admin(id)) with check (public.is_admin(id));

create policy members_read   on public.org_members for select to authenticated using (public.is_member(org_id));
create policy members_update on public.org_members for update to authenticated using (public.is_admin(org_id)) with check (public.is_admin(org_id));
create policy members_delete on public.org_members for delete to authenticated using (public.is_admin(org_id) or user_id = auth.uid());
-- inserção de membros só por funções security definer (convite aceito / criar org)

create policy models_read on public.box_models for select to authenticated using (true);
-- escrita em box_models só via migration/service role

create policy materials_read   on public.materials for select to authenticated using (public.is_member(org_id));
create policy materials_insert on public.materials for insert to authenticated with check (public.is_admin(org_id));
create policy materials_update on public.materials for update to authenticated using (public.is_admin(org_id)) with check (public.is_admin(org_id));

create policy dielines_read   on public.dielines for select to authenticated using (public.is_member(org_id));
create policy dielines_insert on public.dielines for insert to authenticated
  with check (public.is_member(org_id) and created_by = auth.uid());
create policy dielines_update on public.dielines for update to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy dielines_delete on public.dielines for delete to authenticated
  using (public.is_member(org_id) and (created_by = auth.uid() or public.is_admin(org_id)));

create policy exports_read   on public.exports for select to authenticated using (public.is_member(org_id));
create policy exports_insert on public.exports for insert to authenticated
  with check (public.is_member(org_id) and created_by = auth.uid());
-- exports são imutáveis: sem update/delete

-- Storage: bucket privado 'exports', caminho '<org_id>/<export_id>.zip' --------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exports', 'exports', false, 10485760, array['application/zip'])
on conflict (id) do nothing;

create policy exports_files_read on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy exports_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'exports' and public.is_member(((storage.foldername(name))[1])::uuid));

-- Catálogo (referência) --------------------------------------------------------
insert into public.box_models (slug, nome, categoria, entradas, ordem, enabled) values
  ('fundo-cartucho',            'Caixa fundo cartucho',               'caixa',      array['largura','altura','profundidade'], 10, false),
  ('fundo-automatico',          'Caixa fundo automático',             'caixa',      array['largura','altura','profundidade'], 20, false),
  ('sacola',                    'Sacola de papel',                    'sacola',     array['largura','altura','fole'],         30, false),
  ('fundo-manual-123',          'Caixa fundo manual 1-2-3',           'caixa',      array['largura','altura','profundidade'], 40, false),
  ('display-fundo-automatico',  'Display fundo automático',           'display',    array['largura','altura','profundidade'], 50, false),
  ('display-fundo-manual',      'Display fundo manual',               'display',    array['largura','altura','profundidade'], 60, false),
  ('caixa-transporte',          'Caixa para transporte',              'transporte', array['largura','altura','profundidade'], 70, false),
  ('moldura-com-tampa',         'Caixa moldura com tampa',            'tampa',      array['largura','altura','profundidade'], 80, false),
  ('alca-fundo-automatico',     'Caixa com alça, fundo automático',   'alca',       array['largura','altura','profundidade'], 90, false),
  ('alca-fundo-manual',         'Caixa com alça, fundo manual',       'alca',       array['largura','altura','profundidade'], 100, false),
  ('caixa-gaveta',              'Caixa gaveta',                       'gaveta',     array['largura','altura','profundidade'], 110, false),
  ('caixa-triangular',          'Caixa triangular',                   'especial',   array['largura','altura','profundidade'], 120, false)
on conflict (slug) do nothing;

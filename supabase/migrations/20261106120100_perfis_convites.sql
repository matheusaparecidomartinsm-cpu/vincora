-- Gerador de Facas — 0002 perfis, convites, criação de org, limite de export

-- Perfis (nome e e-mail visíveis para quem é da mesma org) --------------------
create table public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nome        text check (nome is null or length(nome) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index user_profiles_email_idx on public.user_profiles (lower(email));
create trigger user_profiles_updated before update on public.user_profiles
  for each row execute function public.set_updated_at();

create or replace function public.shares_org(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_members a
    join public.org_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

alter table public.user_profiles enable row level security;
create policy profiles_read on public.user_profiles for select to authenticated
  using (id = auth.uid() or public.shares_org(id));
create policy profiles_update on public.user_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Convites --------------------------------------------------------------------
create table public.org_invites (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  papel        text not null default 'member' check (papel in ('admin','member')),
  invited_by   uuid default auth.uid() references auth.users(id) on delete set null,
  expires_at   timestamptz not null default now() + interval '14 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index org_invites_pendente_uq on public.org_invites (org_id, lower(email)) where accepted_at is null;
create index org_invites_email_idx on public.org_invites (lower(email)) where accepted_at is null;
create index org_invites_invited_by_idx on public.org_invites (invited_by);
create trigger org_invites_updated before update on public.org_invites
  for each row execute function public.set_updated_at();

alter table public.org_invites enable row level security;
create policy invites_admin on public.org_invites for all to authenticated
  using (public.is_admin(org_id)) with check (public.is_admin(org_id) and invited_by = auth.uid());

-- Aceita convites pendentes do e-mail do usuário (chamado no cadastro e no login)
create or replace function public.accept_invites_for(p_user uuid, p_email text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int := 0;
  inv record;
begin
  for inv in
    select * from public.org_invites
     where lower(email) = lower(p_email) and accepted_at is null and expires_at > now()
     for update
  loop
    insert into public.org_members (org_id, user_id, papel)
    values (inv.org_id, p_user, inv.papel)
    on conflict (org_id, user_id) do nothing;
    update public.org_invites set accepted_at = now() where id = inv.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.accept_invites_for(uuid, text) from public, anon, authenticated;

create or replace function public.accept_my_invites() returns int
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  -- só e-mail confirmado aceita convite
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    return 0;
  end if;
  return public.accept_invites_for(auth.uid(), (select email from auth.users where id = auth.uid()));
end $$;
revoke all on function public.accept_my_invites() from public, anon;
grant execute on function public.accept_my_invites() to authenticated;

-- Ao criar usuário no Auth: cria perfil (convites são aceitos no primeiro login, com e-mail confirmado)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles (id, email, nome)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data->>'nome'), ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.user_profiles set email = new.email where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Primeira org: quem não pertence a nenhuma pode criar uma e vira admin -------
create or replace function public.create_org(p_nome text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  if exists (select 1 from public.org_members where user_id = auth.uid()) then
    raise exception 'Você já faz parte de uma organização.' using errcode = 'P0001';
  end if;
  insert into public.orgs (nome) values (trim(p_nome)) returning id into v_org;
  insert into public.org_members (org_id, user_id, papel) values (v_org, auth.uid(), 'admin');
  insert into public.materials (org_id, nome, gramatura_g, espessura_mm) values
    (v_org, 'Duplex 300 g', 300, 0.345);
  return v_org;
end $$;
revoke all on function public.create_org(text) from public, anon;
grant execute on function public.create_org(text) to authenticated;

-- Limite de exports: no máximo 20 por usuário por minuto ------------------------
create or replace function public.exports_rate_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.exports
       where created_by = new.created_by and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Muitas exportações seguidas. Espere um minuto.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger exports_rate_limit before insert on public.exports
  for each row execute function public.exports_rate_limit();

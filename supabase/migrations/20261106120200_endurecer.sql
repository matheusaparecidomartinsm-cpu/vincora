-- Gerador de Facas — 0003 ajustes apontados pelo linter do Supabase
-- 1) Funções auxiliares e de gatilho saem do esquema exposto pela API (public → private).
--    Políticas e gatilhos apontam para a função pelo OID, então continuam funcionando.
-- 2) Políticas com auth.uid() passam a usar (select auth.uid()) — avaliado uma vez por consulta.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_member(uuid) set schema private;
alter function public.is_admin(uuid) set schema private;
alter function public.shares_org(uuid) set schema private;
alter function public.accept_invites_for(uuid, text) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.handle_user_email_change() set schema private;

-- auxiliares de RLS: só quem está logado (as políticas são todas "to authenticated")
revoke all on function private.is_member(uuid), private.is_admin(uuid), private.shares_org(uuid) from public, anon;
grant execute on function private.is_member(uuid), private.is_admin(uuid), private.shares_org(uuid) to authenticated;
-- internas: ninguém chama direto
revoke all on function private.accept_invites_for(uuid, text), private.handle_new_user(), private.handle_user_email_change() from public, anon, authenticated;

-- accept_my_invites passa a chamar a versão em private
create or replace function public.accept_my_invites() returns int
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    return 0;
  end if;
  return private.accept_invites_for(auth.uid(), (select email from auth.users where id = auth.uid()));
end $$;
revoke all on function public.accept_my_invites() from public, anon;
grant execute on function public.accept_my_invites() to authenticated;

-- políticas com auth.uid() avaliado uma vez
drop policy members_delete on public.org_members;
create policy members_delete on public.org_members for delete to authenticated
  using (private.is_admin(org_id) or user_id = (select auth.uid()));

drop policy dielines_insert on public.dielines;
create policy dielines_insert on public.dielines for insert to authenticated
  with check (private.is_member(org_id) and created_by = (select auth.uid()));

drop policy dielines_delete on public.dielines;
create policy dielines_delete on public.dielines for delete to authenticated
  using (private.is_member(org_id) and (created_by = (select auth.uid()) or private.is_admin(org_id)));

drop policy exports_insert on public.exports;
create policy exports_insert on public.exports for insert to authenticated
  with check (private.is_member(org_id) and created_by = (select auth.uid()));

drop policy profiles_read on public.user_profiles;
create policy profiles_read on public.user_profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_org(id));

drop policy profiles_update on public.user_profiles;
create policy profiles_update on public.user_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy invites_admin on public.org_invites;
create policy invites_admin on public.org_invites for all to authenticated
  using (private.is_admin(org_id)) with check (private.is_admin(org_id) and invited_by = (select auth.uid()));

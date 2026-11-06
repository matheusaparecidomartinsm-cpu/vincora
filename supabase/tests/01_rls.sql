-- Testes de acesso (RLS). Roda como superusuário e troca de papel/usuário para cada caso.
-- Qualquer falha aborta com ERROR. Saída esperada: "RLS OK".
\set ON_ERROR_STOP on

-- Supabase concede tudo nas tabelas a anon/authenticated e deixa a RLS restringir.
grant all on all tables in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to authenticated;
grant execute on function private.is_member(uuid), private.is_admin(uuid), private.shares_org(uuid) to authenticated;
revoke execute on function private.accept_invites_for(uuid, text) from authenticated;

create or replace function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
  if p is null then set role anon; else set role authenticated; end if;
end $$;
create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok — %', msg;
end $$;
-- espera erro ao rodar sql
create or replace function pg_temp.expect_error(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok — % (%)', msg, sqlerrm;
    return;
  end;
  raise exception 'FALHOU (deveria dar erro): %', msg;
end $$;

-- usuários fictícios
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@exemplo.test',   now(), '{"nome":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@outra.test',   now(), '{"nome":"Bruno"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carla@exemplo.test', now(), '{"nome":"Carla"}'),
  ('00000000-0000-0000-0000-00000000000d', 'davi@exemplo.test',  null,  '{"nome":"Davi"}');

select pg_temp.check((select count(*) from public.user_profiles) = 4, 'trigger cria perfil para cada usuário');

-- Ana cria a org A ----------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select set_config('t.org_a', public.create_org('ProFood Teste')::text, false);
select pg_temp.check((select count(*) from public.org_members) = 1, 'Ana vira admin da org A');
select pg_temp.check((select count(*) from public.materials) = 1, 'org nova vem com um material padrão');
select pg_temp.expect_error($$select public.create_org('Outra')$$, 'quem já tem org não cria outra');

insert into public.dielines (org_id, model_slug, nome, largura_mm, altura_mm, profundidade_mm, espessura_mm)
values (current_setting('t.org_a')::uuid, 'fundo-cartucho', 'Caixa da Ana', 70, 150, 40, 0.345);
select set_config('t.faca_a', (select id::text from public.dielines limit 1), false);
select pg_temp.expect_error(
  format($$insert into public.dielines (org_id, created_by, model_slug, nome, largura_mm, altura_mm, profundidade_mm, espessura_mm)
           values (%L, '00000000-0000-0000-0000-00000000000b', 'fundo-cartucho', 'x', 1, 1, 1, 0.3)$$, current_setting('t.org_a')),
  'não dá para gravar faca em nome de outro usuário');
insert into storage.objects (bucket_id, name) values ('exports', current_setting('t.org_a') || '/a.zip');
insert into public.org_invites (org_id, email) values (current_setting('t.org_a')::uuid, 'Carla@Exemplo.test');
insert into public.org_invites (org_id, email) values (current_setting('t.org_a')::uuid, 'davi@exemplo.test');
select pg_temp.expect_error($$update public.org_members set papel = 'member'$$, 'último admin não pode ser rebaixado');
reset role;

-- Bruno cria a org B e tenta ver/alterar a A ----------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select set_config('t.org_b', public.create_org('Outra Gráfica')::text, false);
select pg_temp.check((select count(*) from public.orgs) = 1, 'Bruno só vê a própria org');
select pg_temp.check((select count(*) from public.dielines) = 0, 'Bruno não vê facas da org A');
select pg_temp.check((select count(*) from public.materials where org_id = current_setting('t.org_a')::uuid) = 0, 'Bruno não vê materiais da org A');
select pg_temp.check((select count(*) from public.org_invites) = 0, 'Bruno não vê convites da org A');
select pg_temp.check((select count(*) from public.user_profiles) = 1, 'Bruno só vê o próprio perfil');
select pg_temp.check((select count(*) from storage.objects) = 0, 'Bruno não vê arquivos da org A');
update public.dielines set nome = 'hackeada' where id = current_setting('t.faca_a')::uuid;
delete from public.dielines where id = current_setting('t.faca_a')::uuid;
select pg_temp.expect_error(
  format($$insert into public.dielines (org_id, model_slug, nome, largura_mm, altura_mm, profundidade_mm, espessura_mm)
           values (%L, 'fundo-cartucho', 'intrusa', 70, 150, 40, 0.345)$$, current_setting('t.org_a')),
  'Bruno não grava faca na org A');
select pg_temp.expect_error(format($$insert into storage.objects (bucket_id, name) values ('exports', %L)$$, current_setting('t.org_a') || '/b.zip'),
  'Bruno não sobe arquivo na pasta da org A');
select pg_temp.expect_error(format($$insert into public.org_invites (org_id, email) values (%L, 'x@y.test')$$, current_setting('t.org_a')),
  'Bruno não convida para a org A');
-- material da org B numa faca da org B: ok; material da org A: recusado
select set_config('t.mat_b', (select id::text from public.materials limit 1), false);
insert into public.dielines (org_id, model_slug, nome, largura_mm, altura_mm, profundidade_mm, espessura_mm, material_id)
values (current_setting('t.org_b')::uuid, 'fundo-cartucho', 'Caixa do Bruno', 50, 80, 30, 0.345, current_setting('t.mat_b')::uuid);
reset role;
select pg_temp.check((select nome from public.dielines where id = current_setting('t.faca_a')::uuid) = 'Caixa da Ana', 'faca da Ana continua intacta');
select set_config('t.mat_a', (select id::text from public.materials where org_id = current_setting('t.org_a')::uuid limit 1), false);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error(
  format($$update public.dielines set material_id = %L where nome = 'Caixa do Bruno'$$, current_setting('t.mat_a')),
  'faca não pode usar material de outra org');
-- tentar mudar a org: o gatilho mantém a original (sem erro)
select set_config('t.sql', format($$update public.dielines set org_id = %L where nome = 'Caixa do Bruno'$$, current_setting('t.org_a')), false);
do $$ begin execute current_setting('t.sql'); end $$;
reset role;
select pg_temp.check((select org_id::text from public.dielines where nome = 'Caixa do Bruno') = current_setting('t.org_b'), 'org da faca do Bruno não mudou');

-- Carla aceita o convite (e-mail com maiúsculas diferentes) -------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check(public.accept_my_invites() = 1, 'Carla aceita 1 convite');
select pg_temp.check((select count(*) from public.dielines) = 1, 'Carla vê a faca da org A');
select pg_temp.check((select count(*) from public.user_profiles) = 2, 'Carla vê o perfil da Ana (mesma org), não o do Bruno');
select pg_temp.expect_error($$select private.accept_invites_for('00000000-0000-0000-0000-00000000000c', 'bruno@outra.test')$$, 'função interna de convite não é chamável pelo app');
select pg_temp.expect_error(format($$insert into public.materials (org_id, nome, espessura_mm) values (%L, 'Kraft', 0.4)$$, current_setting('t.org_a')),
  'membro não cadastra material');
delete from public.dielines where id = current_setting('t.faca_a')::uuid;  -- não é dela: 0 linhas
reset role;
select pg_temp.check((select count(*) from public.dielines where id = current_setting('t.faca_a')::uuid) = 1, 'membro não exclui faca de outra pessoa');

-- Davi tem convite mas e-mail não confirmado ----------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(public.accept_my_invites() = 0, 'e-mail não confirmado não aceita convite');
select pg_temp.check((select count(*) from public.dielines) = 0, 'Davi não vê nada');
reset role;

-- Exports: imutáveis e com limite de taxa --------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.exports (org_id, model_slug, spec, motor_versao, filename, storage_path, bbox_w_mm, bbox_h_mm, papel)
select current_setting('t.org_a')::uuid, 'fundo-cartucho', '{}', 't', 'f.zip', current_setting('t.org_a') || '/' || g || '.zip', 1, 1, 'A3'
from generate_series(1, 20) g;
select pg_temp.expect_error(
  format($$insert into public.exports (org_id, model_slug, spec, motor_versao, filename, storage_path, bbox_w_mm, bbox_h_mm, papel)
           values (%L, 'fundo-cartucho', '{}', 't', 'f.zip', %L, 1, 1, 'A3')$$, current_setting('t.org_a'), current_setting('t.org_a') || '/21.zip'),
  '21º export no mesmo minuto é recusado');
update public.exports set filename = 'x';
reset role;
select pg_temp.check((select count(*) from public.exports where filename = 'x') = 0, 'exports não podem ser alterados');

-- Anônimo não vê nada ----------------------------------------------------------
select pg_temp.as_user(null);
select pg_temp.check((select count(*) from public.dielines) = 0 and (select count(*) from public.box_models) = 0, 'anônimo não vê nada');
reset role;

-- Excluir conta: membro comum sai sem problema; último admin é bloqueado --------
delete from auth.users where id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) from public.org_members where user_id = '00000000-0000-0000-0000-00000000000c') = 0, 'excluir conta remove o vínculo');
select pg_temp.expect_error($$delete from auth.users where id = '00000000-0000-0000-0000-00000000000a'$$, 'último admin não some sem antes resolver a org');
delete from public.orgs where id = current_setting('t.org_a')::uuid;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) from public.dielines where org_id = current_setting('t.org_a')::uuid) = 0, 'apagar a org apaga as facas dela');

select 'RLS OK' as resultado;

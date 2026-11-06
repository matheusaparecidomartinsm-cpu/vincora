-- Dados fictícios para um projeto de DESENVOLVIMENTO (rode depois de criar sua conta e a organização).
-- Substitua o e-mail abaixo pelo seu. Nenhuma pessoa real.
do $$
declare v_org uuid; v_user uuid;
begin
  select id into v_user from auth.users where email = 'SEU-EMAIL@exemplo.com';
  select org_id into v_org from public.org_members where user_id = v_user limit 1;
  if v_org is null then raise exception 'Crie a conta e a organização pelo app antes de rodar o seed.'; end if;
  insert into public.materials (org_id, nome, gramatura_g, espessura_mm) values
    (v_org, 'Duplex 250 g', 250, 0.300), (v_org, 'Triplex 350 g', 350, 0.450), (v_org, 'Kraft 280 g', 280, 0.380)
  on conflict do nothing;
  insert into public.dielines (org_id, created_by, model_slug, nome, largura_mm, altura_mm, profundidade_mm, espessura_mm, sangria, areas_cola, os_numero, cliente) values
    (v_org, v_user, 'fundo-cartucho', 'Caixa vela 200 ml', 70, 150, 40, 0.345, true, true, '48213', 'Velas Aurora (fictício)'),
    (v_org, v_user, 'fundo-cartucho', 'Sachê de chá — caixa 10 un.', 80, 120, 35, 0.345, true, true, null, null);
end $$;

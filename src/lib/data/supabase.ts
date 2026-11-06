"use client";
/**
 * Camada de dados real (Supabase). Mesma interface da camada falsa.
 * Toda autorização é feita pela RLS no banco — este arquivo só traduz nomes de colunas.
 */
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { DataLayer, DielineRecord, ExportRecord, Invite, Material, Member } from "./types";

const sb = () => supabaseBrowser();

function fail(e: PostgrestError | null, fallback = "Não foi possível concluir. Tente de novo."): never {
  // mensagens de regra de negócio vêm dos gatilhos com errcode P0001
  if (e?.code === "P0001") throw new Error(e.message);
  if (e?.code === "23505") throw new Error("Já existe um registro com esse nome.");
  if (e?.code === "42501") throw new Error("Você não tem permissão para isso.");
  throw new Error(fallback);
}

let orgCache: { userId: string; orgId: string } | null = null;
async function ctx() {
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre de novo.");
  if (orgCache?.userId === data.user.id) return { user: data.user, orgId: orgCache.orgId };
  const { data: m, error } = await sb().from("org_members").select("org_id").eq("user_id", data.user.id).order("created_at").limit(1).maybeSingle();
  if (error) fail(error);
  if (!m) throw new Error("Você ainda não faz parte de uma organização.");
  orgCache = { userId: data.user.id, orgId: m.org_id };
  return { user: data.user, orgId: m.org_id as string };
}

type Row = Record<string, unknown>;
const num = (v: unknown) => (v == null ? null : Number(v));

const toMaterial = (r: Row): Material => ({
  id: r.id as string,
  orgId: r.org_id as string,
  nome: r.nome as string,
  gramaturaG: num(r.gramatura_g),
  espessuraMm: Number(r.espessura_mm),
  arquivado: r.arquivado as boolean,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const toDieline = (r: Row): DielineRecord => ({
  id: r.id as string,
  orgId: r.org_id as string,
  createdBy: (r.created_by as string) ?? null,
  modelSlug: r.model_slug as string,
  nome: r.nome as string,
  largura: Number(r.largura_mm),
  altura: Number(r.altura_mm),
  profundidade: Number(r.profundidade_mm),
  materialId: (r.material_id as string) ?? null,
  espessura: Number(r.espessura_mm),
  sangria: r.sangria as boolean,
  areasCola: r.areas_cola as boolean,
  osNumero: (r.os_numero as string) ?? null,
  cliente: (r.cliente as string) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const toExport = (r: Row): ExportRecord => ({
  id: r.id as string,
  orgId: r.org_id as string,
  dielineId: (r.dieline_id as string) ?? null,
  modelSlug: r.model_slug as string,
  createdBy: (r.created_by as string) ?? null,
  spec: r.spec as ExportRecord["spec"],
  motorVersao: r.motor_versao as string,
  filename: r.filename as string,
  bboxW: Number(r.bbox_w_mm),
  bboxH: Number(r.bbox_h_mm),
  papel: r.papel as string,
  createdAt: r.created_at as string,
});

/** Busca sem curingas do PostgREST: escapa % _ , ( ) */
const like = (q: string) => `%${q.replace(/[%_\\,()]/g, (c) => "\\" + c)}%`;

export const supabaseData: DataLayer = {
  async currentUser() {
    const { user, orgId } = await ctx();
    const [{ data: p }, { data: m }] = await Promise.all([
      sb().from("user_profiles").select("nome, email").eq("id", user.id).maybeSingle(),
      sb().from("org_members").select("papel").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
    ]);
    return { id: user.id, nome: p?.nome ?? user.email ?? "", email: p?.email ?? user.email ?? "", papel: (m?.papel ?? "member") as Member["papel"] };
  },

  async listMaterials(opts) {
    const { orgId } = await ctx();
    let q = sb().from("materials").select("*").eq("org_id", orgId).order("nome");
    if (!opts?.incluirArquivados) q = q.eq("arquivado", false);
    const { data, error } = await q;
    if (error) fail(error);
    return (data ?? []).map(toMaterial);
  },

  async saveMaterial(input) {
    const { orgId } = await ctx();
    const row = { nome: input.nome.trim(), gramatura_g: input.gramaturaG, espessura_mm: input.espessuraMm };
    const { data, error } = input.id
      ? await sb().from("materials").update(row).eq("id", input.id).select().single()
      : await sb().from("materials").insert({ ...row, org_id: orgId }).select().single();
    if (error) fail(error, error.code === "23505" ? "Já existe um material com esse nome." : undefined);
    return toMaterial(data);
  },

  async setMaterialArchived(id, arquivado) {
    const { error } = await sb().from("materials").update({ arquivado }).eq("id", id);
    if (error) fail(error);
  },

  async listDielines(opts) {
    const { orgId } = await ctx();
    let q = sb().from("dielines").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }).limit(500);
    if (opts?.model) q = q.eq("model_slug", opts.model);
    if (opts?.q?.trim()) {
      const t = like(opts.q.trim());
      q = q.or(`nome.ilike.${t},os_numero.ilike.${t},cliente.ilike.${t}`);
    }
    const { data, error } = await q;
    if (error) fail(error);
    return (data ?? []).map(toDieline);
  },

  async getDieline(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const { data, error } = await sb().from("dielines").select("*").eq("id", id).maybeSingle();
    if (error) fail(error);
    return data ? toDieline(data) : null;
  },

  async saveDieline(input) {
    const { orgId } = await ctx();
    const row = {
      model_slug: input.modelSlug,
      nome: input.nome.trim(),
      largura_mm: input.largura,
      altura_mm: input.altura,
      profundidade_mm: input.profundidade,
      material_id: input.materialId,
      espessura_mm: input.espessura,
      sangria: input.sangria,
      areas_cola: input.areasCola,
      os_numero: input.osNumero,
      cliente: input.cliente,
    };
    if (!row.nome) throw new Error("Dê um nome para a faca.");
    const { data, error } = input.id
      ? await sb().from("dielines").update(row).eq("id", input.id).select().single()
      : await sb().from("dielines").insert({ ...row, org_id: orgId }).select().single();
    if (error) fail(error);
    return toDieline(data);
  },

  async deleteDieline(id) {
    const { error, count } = await sb().from("dielines").delete({ count: "exact" }).eq("id", id);
    if (error) fail(error);
    if (count === 0) throw new Error("Só quem criou a faca ou um administrador pode excluí-la.");
  },

  /** Com backend, o servidor grava o export na própria rota /api/export. */
  async recordExport() {
    throw new Error("recordExport é feito no servidor quando há backend.");
  },

  async listExports(opts) {
    const { orgId } = await ctx();
    let q = sb().from("exports").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(opts?.limit ?? 50);
    if (opts?.dielineId) q = q.eq("dieline_id", opts.dielineId);
    const { data, error } = await q;
    if (error) fail(error);
    return (data ?? []).map(toExport);
  },

  async listMembers() {
    const { orgId } = await ctx();
    const { data: ms, error } = await sb().from("org_members").select("user_id, papel").eq("org_id", orgId);
    if (error) fail(error);
    const ids = (ms ?? []).map((m) => m.user_id);
    const { data: ps } = ids.length ? await sb().from("user_profiles").select("id, nome, email").in("id", ids) : { data: [] };
    const byId = new Map((ps ?? []).map((p) => [p.id, p]));
    return (ms ?? [])
      .map((m) => {
        const p = byId.get(m.user_id);
        return { id: m.user_id, nome: p?.nome ?? p?.email ?? "—", email: p?.email ?? "", papel: m.papel } as Member;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  },

  async setMemberRole(userId, papel) {
    const { orgId } = await ctx();
    const { error, count } = await sb().from("org_members").update({ papel }, { count: "exact" }).eq("org_id", orgId).eq("user_id", userId);
    if (error) fail(error);
    if (count === 0) throw new Error("Só administradores mudam papéis.");
  },

  async removeMember(userId) {
    const { orgId } = await ctx();
    const { error, count } = await sb().from("org_members").delete({ count: "exact" }).eq("org_id", orgId).eq("user_id", userId);
    if (error) fail(error);
    if (count === 0) throw new Error("Só administradores removem pessoas.");
  },

  async listInvites() {
    const { orgId } = await ctx();
    const { data, error } = await sb()
      .from("org_invites")
      .select("id, email, papel, expires_at, created_at")
      .eq("org_id", orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) fail(error);
    return (data ?? []).map((r) => ({ id: r.id, email: r.email, papel: r.papel, expiresAt: r.expires_at, createdAt: r.created_at }) as Invite);
  },

  async invite(email, papel) {
    const res = await fetch("/api/convites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, papel }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Não foi possível convidar.");
    return { emailEnviado: !!body.emailEnviado };
  },

  async revokeInvite(id) {
    const { error } = await sb().from("org_invites").delete().eq("id", id);
    if (error) fail(error);
  },

  async updateMyName(nome) {
    const { user } = await ctx();
    const { error } = await sb().from("user_profiles").update({ nome: nome.trim() || null }).eq("id", user.id);
    if (error) fail(error);
  },
};

export function clearOrgCache() {
  orgCache = null;
}

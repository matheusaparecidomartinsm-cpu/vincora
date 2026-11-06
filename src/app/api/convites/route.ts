import { NextResponse } from "next/server";
import { z } from "zod";
import { SITE_URL } from "@/lib/env";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(254),
  papel: z.enum(["admin", "member"]),
});

/**
 * Admin convida alguém: grava o convite (RLS: só admin da org) e pede ao Supabase Auth
 * para mandar o e-mail de convite. Quem já tem conta recebe o acesso no próximo login.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const { email, papel } = parsed.data;

  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  if (!auth.orgId || auth.papel !== "admin") return NextResponse.json({ error: "Só administradores convidam." }, { status: 403 });
  const { sb, user, orgId } = auth;

  // limite: 20 convites por hora por administrador
  const { count } = await sb
    .from("org_invites")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", user.id)
    .gt("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= 20) return NextResponse.json({ error: "Limite de convites por hora atingido." }, { status: 429 });

  const { error } = await sb.from("org_invites").insert({ org_id: orgId, email, papel });
  if (error) {
    const msg = error.code === "23505" ? "Já existe um convite pendente para esse e-mail." : "Não foi possível criar o convite.";
    return NextResponse.json({ error: msg }, { status: error.code === "23505" ? 409 : 500 });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ ok: true, emailEnviado: false });
  const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/` });
  // se a pessoa já tem conta, o Supabase recusa o convite por e-mail: ela entra normalmente e o convite é aceito no login
  return NextResponse.json({ ok: true, emailEnviado: !mailErr });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({ confirmacao: z.literal("EXCLUIR") });

/**
 * Exclui a conta de verdade (auth.users → cascata em perfil e vínculos).
 * Facas e exports ficam com a organização, sem autor.
 * Último administrador: se há outras pessoas, precisa passar a administração antes;
 * se está sozinho, a organização inteira é apagada junto.
 */
export async function DELETE(req: Request) {
  if (!Body.safeParse(await req.json().catch(() => null)).success)
    return NextResponse.json({ error: "Digite EXCLUIR para confirmar." }, { status: 400 });

  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Exclusão de conta não configurada no servidor." }, { status: 503 });
  const { user } = auth;

  const { data: vinculos } = await admin.from("org_members").select("org_id, papel").eq("user_id", user.id);
  for (const v of vinculos ?? []) {
    if (v.papel !== "admin") continue;
    const { data: outros } = await admin.from("org_members").select("user_id, papel").eq("org_id", v.org_id).neq("user_id", user.id);
    const outrosAdmins = (outros ?? []).filter((o) => o.papel === "admin").length;
    if (outrosAdmins > 0) continue;
    if ((outros ?? []).length > 0)
      return NextResponse.json({ error: "Você é o único administrador. Passe a administração para outra pessoa em Equipe antes de excluir a conta." }, { status: 409 });
    // sozinho na org: apaga arquivos e a org
    const { data: arquivos } = await admin.storage.from("exports").list(v.org_id, { limit: 1000 });
    if (arquivos?.length) await admin.storage.from("exports").remove(arquivos.map((a) => `${v.org_id}/${a.name}`));
    await admin.from("orgs").delete().eq("id", v.org_id);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Não foi possível excluir a conta." }, { status: 500 });
  await auth.sb.auth.signOut({ scope: "global" }).catch(() => {});
  return NextResponse.json({ ok: true });
}

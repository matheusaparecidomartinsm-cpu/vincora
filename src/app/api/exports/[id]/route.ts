import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Gera um novo link assinado (10 min) para um export antigo. A RLS garante que é da mesma org. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Export inválido." }, { status: 400 });
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { data } = await auth.sb.from("exports").select("storage_path, filename").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Export não encontrado." }, { status: 404 });

  const signed = await auth.sb.storage.from("exports").createSignedUrl(data.storage_path, 600, { download: data.filename });
  if (signed.error) return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}

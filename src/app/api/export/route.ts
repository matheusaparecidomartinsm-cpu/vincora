import { NextResponse } from "next/server";
import { z } from "zod";
import { BACKEND } from "@/lib/env";
import { build, MOTOR_VERSAO } from "@/lib/dieline/models";
import { smallestPaper } from "@/lib/dieline/paper";
import { buildZip } from "@/lib/dieline/render/zip";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  spec: z.object({ model: z.string().max(60) }).passthrough(),
  dielineId: z.string().uuid().nullish(),
  os: z.string().max(20).nullish(),
  cliente: z.string().max(80).nullish(),
});

/**
 * Gera PDF + SVG + DXF no servidor, revalidando as regras do modelo.
 * - Com backend: exige login, grava o .zip no Storage (pasta da org), registra em `exports`
 *   e devolve uma URL assinada de 10 minutos.
 * - Sem backend (modo local): devolve o .zip direto.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  const { spec, dielineId, os, cliente } = parsed.data;

  const r = build(spec as never);
  if (!r.ok) return NextResponse.json({ error: "Medidas fora da regra do modelo.", errors: r.errors }, { status: 422 });

  const extra = { os: os?.trim() || undefined, cliente: cliente?.trim() || undefined };
  const paper = smallestPaper(r.dieline.bbox.w, r.dieline.bbox.h);

  if (!BACKEND) {
    const { zip, filename } = await buildZip(r.spec, r.dieline, extra);
    return new NextResponse(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Filename": filename,
        "X-Papel": paper.name,
        "X-Motor": MOTOR_VERSAO,
        "Cache-Control": "no-store",
      },
    });
  }

  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  if (!auth.orgId) return NextResponse.json({ error: "Você ainda não faz parte de uma organização." }, { status: 403 });
  const { sb, user, orgId } = auth;

  // checagem antecipada do limite (o gatilho do banco é a garantia final)
  const { count } = await sb
    .from("exports")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id)
    .gt("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((count ?? 0) >= 20) return NextResponse.json({ error: "Muitas exportações seguidas. Espere um minuto." }, { status: 429 });

  const { zip, filename } = await buildZip(r.spec, r.dieline, extra);
  const id = crypto.randomUUID();
  const path = `${orgId}/${id}.zip`;

  const up = await sb.storage.from("exports").upload(path, zip, { contentType: "application/zip", upsert: false });
  if (up.error) return NextResponse.json({ error: "Não foi possível guardar o arquivo." }, { status: 500 });

  const { data: rec, error } = await sb
    .from("exports")
    .insert({
      id,
      org_id: orgId,
      dieline_id: dielineId ?? null,
      model_slug: r.spec.model,
      spec: r.spec,
      motor_versao: MOTOR_VERSAO,
      filename,
      storage_path: path,
      bbox_w_mm: r.dieline.bbox.w,
      bbox_h_mm: r.dieline.bbox.h,
      papel: paper.name,
    })
    .select("id")
    .single();
  if (error || !rec) {
    const msg = error?.code === "P0001" ? error.message : "Não foi possível registrar o export.";
    return NextResponse.json({ error: msg }, { status: error?.code === "P0001" ? 429 : 500 });
  }

  const signed = await sb.storage.from("exports").createSignedUrl(path, 600, { download: filename });
  if (signed.error) return NextResponse.json({ error: "Arquivo gerado, mas o link falhou. Baixe de novo pelo histórico." }, { status: 500 });

  return NextResponse.json({ url: signed.data.signedUrl, filename, exportId: rec.id, papel: paper.name }, { headers: { "Cache-Control": "no-store" } });
}

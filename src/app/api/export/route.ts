import { NextResponse } from "next/server";
import { build, MOTOR_VERSAO } from "@/lib/dieline/models";
import { smallestPaper } from "@/lib/dieline/paper";
import { buildZip } from "@/lib/dieline/render/zip";

export const runtime = "nodejs";

/**
 * Gera PDF + SVG + DXF no servidor a partir da spec, revalidando as regras do modelo.
 * v1 (sem backend): devolve o .zip direto. Com /replica-backend: sobe para o Storage e devolve URL assinada.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const { spec, os, cliente } = (body ?? {}) as { spec?: Record<string, unknown>; os?: string; cliente?: string };
  if (!spec || typeof spec.model !== "string") return NextResponse.json({ error: "Faltou a especificação da faca." }, { status: 400 });

  const r = build(spec as never);
  if (!r.ok) return NextResponse.json({ error: "Medidas fora da regra do modelo.", errors: r.errors }, { status: 422 });

  const clean = (s?: string) => (typeof s === "string" ? s.slice(0, 80).trim() || undefined : undefined);
  const { zip, filename } = await buildZip(r.spec, r.dieline, { os: clean(os), cliente: clean(cliente) });
  const paper = smallestPaper(r.dieline.bbox.w, r.dieline.bbox.h);

  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Filename": filename,
      "X-Bbox": `${r.dieline.bbox.w.toFixed(2)}x${r.dieline.bbox.h.toFixed(2)}`,
      "X-Papel": paper.name,
      "X-Motor": MOTOR_VERSAO,
      "Cache-Control": "no-store",
    },
  });
}

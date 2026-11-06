import { strToU8, zipSync } from "fflate";
import { MODELS, MOTOR_VERSAO } from "../models";
import type { Dieline, Spec } from "../types";
import { toDXF } from "./dxf";
import { toPDF } from "./pdf";
import { toSVG } from "./svg";

export function fileBase(spec: Spec) {
  const f = (v: number) => String(v).replace(".", ",");
  return `faca-${spec.model}-${f(spec.largura)}x${f(spec.altura)}x${f(spec.profundidade)}`;
}

/** Gera PDF, SVG e DXF e empacota num .zip. */
export async function buildZip(spec: Spec, dl: Dieline, extra: { os?: string; cliente?: string } = {}) {
  const base = fileBase(spec);
  const meta = MODELS[spec.model]?.meta;
  const nome = meta?.nome ?? spec.model;
  const pdf = await toPDF(dl, { titulo: base, modeloNome: nome, validado: meta?.validado ?? false, spec, motorVersao: MOTOR_VERSAO, data: new Date(), ...extra });
  const svg = toSVG(dl, { cotas: true, titulo: base });
  const dxf = toDXF(dl);
  const leia = [
    `${nome} — medidas internas ${spec.largura} x ${spec.altura} x ${spec.profundidade} mm, espessura ${spec.espessura} mm`,
    "",
    `${base}.pdf  impressão e conferência: escala 1:1, cores especiais CORTE/VINCO/SERRILHA, camadas, cotas e régua de 50 mm.`,
    `${base}.svg  para Illustrator, CorelDRAW ou Inkscape: em milímetros, uma camada por tipo de linha.`,
    `${base}.dxf  para plotter de recorte e CAD: só linhas de produção (CORTE, VINCO, SERRILHA), em mm.`,
    "",
    "Antes de produzir: imprima o PDF em 100 % e monte um protótipo com o material final.",
  ].join("\r\n");
  const zip = zipSync(
    {
      [`${base}.pdf`]: pdf,
      [`${base}.svg`]: strToU8(svg),
      [`${base}.dxf`]: strToU8(dxf),
      "LEIA-ME.txt": strToU8(leia),
    },
    { level: 6 },
  );
  return { zip, filename: `${base}.zip` };
}

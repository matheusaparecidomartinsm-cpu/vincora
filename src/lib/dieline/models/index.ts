import { z } from "zod";
import type { Dieline, Spec } from "../types";
import { fundoCartucho } from "./fundo-cartucho";

export type ModelMeta = {
  slug: string;
  nome: string;
  categoria: "caixa" | "display" | "sacola" | "transporte" | "tampa" | "alca" | "gaveta" | "especial";
  /** rótulos dos campos, na ordem largura, altura, profundidade */
  campos: { largura: string; altura: string; profundidade: string };
  /** regra em linguagem simples, mostrada no editor */
  regra: string;
  descricao: string;
  usaCola: boolean;
  /** motor implementado neste código (independe de liberado em produção) */
  implementado: boolean;
  /** true só depois de protótipo físico aprovado na fábrica */
  validado: boolean;
};

const medida = (nome: string, min: number, max: number, maxMsg?: string) =>
  z
    .number({ error: `Informe ${nome}.` })
    .min(min, `${cap(nome)}: mínimo ${min} mm.`)
    .max(max, maxMsg ?? `${cap(nome)}: máximo ${max} mm.`);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const base = z.object({
  model: z.string(),
  espessura: z.number().min(0.1, "Espessura mínima 0,1 mm.").max(3, "Espessura máxima 3 mm."),
  sangria: z.boolean(),
  areasCola: z.boolean(),
});

export type ModelDef = { meta: ModelMeta; schema: z.ZodType<Spec>; generate: (s: Spec) => Dieline };

export const MODELS: Record<string, ModelDef> = {
  "fundo-cartucho": {
    meta: {
      slug: "fundo-cartucho",
      nome: "Caixa fundo cartucho",
      categoria: "caixa",
      campos: { largura: "Largura", altura: "Altura", profundidade: "Profundidade" },
      regra: "Medidas internas da caixa montada. Profundidade até 50 mm.",
      descricao: "Fecha com lingueta em cima e embaixo. Boa para produtos leves: cosméticos, sachês, velas.",
      usaCola: true,
      implementado: true,
      validado: false,
    },
    schema: base
      .extend({
        largura: medida("a largura", 15, 600),
        altura: medida("a altura", 15, 600),
        profundidade: medida("a profundidade", 10, 50, "No fundo cartucho a profundidade vai até 50 mm."),
      }) as z.ZodType<Spec>,
    generate: fundoCartucho,
  },
};

/** Catálogo completo (inclusive os ainda não implementados), na ordem de exibição. */
export const CATALOGO: Pick<ModelMeta, "slug" | "nome" | "categoria" | "implementado">[] = [
  { slug: "fundo-cartucho", nome: "Caixa fundo cartucho", categoria: "caixa", implementado: true },
  { slug: "fundo-automatico", nome: "Caixa fundo automático", categoria: "caixa", implementado: false },
  { slug: "sacola", nome: "Sacola de papel", categoria: "sacola", implementado: false },
  { slug: "fundo-manual-123", nome: "Caixa fundo manual 1-2-3", categoria: "caixa", implementado: false },
  { slug: "display-fundo-automatico", nome: "Display fundo automático", categoria: "display", implementado: false },
  { slug: "display-fundo-manual", nome: "Display fundo manual", categoria: "display", implementado: false },
  { slug: "caixa-transporte", nome: "Caixa para transporte", categoria: "transporte", implementado: false },
  { slug: "moldura-com-tampa", nome: "Caixa moldura com tampa", categoria: "tampa", implementado: false },
  { slug: "alca-fundo-automatico", nome: "Caixa com alça, fundo automático", categoria: "alca", implementado: false },
  { slug: "alca-fundo-manual", nome: "Caixa com alça, fundo manual", categoria: "alca", implementado: false },
  { slug: "caixa-gaveta", nome: "Caixa gaveta", categoria: "gaveta", implementado: false },
  { slug: "caixa-triangular", nome: "Caixa triangular", categoria: "especial", implementado: false },
];

export const CATEGORIAS: Record<ModelMeta["categoria"], string> = {
  caixa: "Caixas",
  display: "Displays",
  sacola: "Sacolas",
  transporte: "Transporte",
  tampa: "Com tampa",
  alca: "Com alça",
  gaveta: "Gaveta",
  especial: "Especiais",
};

export type ValidationResult =
  | { ok: true; spec: Spec; dieline: Dieline }
  | { ok: false; errors: Partial<Record<keyof Spec | "_", string>> };

/** Valida com as regras do modelo e, se passar, gera a faca. */
export function build(input: Partial<Spec> & { model: string }): ValidationResult {
  const def = MODELS[input.model];
  if (!def) return { ok: false, errors: { _: "Modelo não disponível." } };
  const r = def.schema.safeParse(input);
  if (!r.success) {
    const errors: Partial<Record<keyof Spec | "_", string>> = {};
    for (const iss of r.error.issues) {
      const k = (iss.path[0] as keyof Spec) ?? "_";
      if (!errors[k]) errors[k] = iss.message;
    }
    return { ok: false, errors };
  }
  return { ok: true, spec: r.data, dieline: def.generate(r.data) };
}

export const MOTOR_VERSAO = "0.1.0";

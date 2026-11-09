/**
 * Caixa 3D a partir da MESMA geometria da faca: uma árvore de painéis ligados por dobradiças.
 * Coordenadas locais em mm, y PARA CIMA (no 3D o vinco inferior do corpo fica em y = 0).
 * O interior da caixa fica sempre no -z local de cada painel.
 *
 * Cada nó: polígono no próprio referencial, ponto da dobradiça no referencial do pai,
 * eixo de giro e ângulo final (graus). `etapa` define a ordem de dobra.
 */
import * as F from "./allowances";
import type { Spec } from "./types";

export type FoldNode = {
  nome: string;
  poly: [number, number][];
  /** posição da dobradiça no referencial do pai */
  origem: [number, number];
  eixo: "x" | "y" | null;
  /** ângulo totalmente dobrado, em graus */
  angulo: number;
  /** 0 corpo · 1 abas de pó · 2 tampas · 3 linguetas */
  etapa: number;
  filhos: FoldNode[];
};

export const ETAPAS = 4;

const rect = (w: number, h: number): [number, number][] => [
  [0, 0],
  [w, 0],
  [w, h],
  [0, h],
];

export function foldFundoCartucho(spec: Spec): FoldNode {
  const { largura: L, altura: A, profundidade: P, espessura: t } = spec;
  const wF = F.painel(L, t);
  const wS1 = F.painel(P, t);
  const wB = F.painel(L, t);
  const wS2 = F.painelFinal(P, t);
  const H = F.alturaCorpo(A, t);
  const lidD = F.profundidadeTampa(P, t);
  const tuck = F.alturaLingueta(P, A);
  const ti = F.recuoLingueta(t);
  const g = F.larguraAbaCola(P);
  const gc = F.chanfroAbaCola(g);
  const dh = F.alturaAbaPo(L, P, t);
  const dsL = F.chanfroAbaPoLadoTampa(dh);
  const dsO = F.chanfroAbaPoOutroLado;

  const no = (nome: string, poly: [number, number][], origem: [number, number], eixo: FoldNode["eixo"], angulo: number, etapa: number, filhos: FoldNode[] = []): FoldNode => ({
    nome, poly, origem, eixo, angulo, etapa, filhos,
  });

  // lado direito de uma dobradiça vertical gira +90 (para -z); lado esquerdo gira -90.
  // aba acima de uma dobradiça horizontal gira -90; aba abaixo gira +90.
  const lateral2 = no("lateral 2", rect(wS2, H), [wB, 0], "y", 90, 0, [
    no("aba de pó sup. 2", [[0, 0], [wS2, 0], [wS2 - dsO, dh], [dsL, dh]], [0, H], "x", -90, 1),
    no("aba de pó inf. 2", [[0, 0], [dsO, -dh], [wS2 - dsO, -dh], [wS2, 0]], [0, 0], "x", 90, 1),
  ]);
  const tras = no("trás", rect(wB, H), [wS1, 0], "y", 90, 0, [
    lateral2,
    no("tampa de cima", rect(wB, lidD), [0, H], "x", -90, 2, [
      no("lingueta de cima", [[ti, 0], [wB - ti, 0], [wB - ti, tuck], [ti, tuck]], [0, lidD], "x", -90, 3),
    ]),
  ]);
  const lateral1 = no("lateral 1", rect(wS1, H), [wF, 0], "y", 90, 0, [
    tras,
    no("aba de pó sup. 1", [[0, 0], [wS1, 0], [wS1 - dsL, dh], [dsO, dh]], [0, H], "x", -90, 1),
    no("aba de pó inf. 1", [[0, 0], [dsL, -dh], [wS1 - dsO, -dh], [wS1, 0]], [0, 0], "x", 90, 1),
  ]);
  return no("frente", rect(wF, H), [0, 0], null, 0, 0, [
    no("aba de cola", [[0, 0], [-g, gc], [-g, H - gc], [0, H]], [0, 0], "y", -90, 0),
    lateral1,
    no("tampa de baixo", [[0, 0], [wF, 0], [wF, -lidD], [0, -lidD]], [0, 0], "x", 90, 2, [
      no("lingueta de baixo", [[ti, 0], [wF - ti, 0], [wF - ti, -tuck], [ti, -tuck]], [0, -lidD], "x", 90, 3),
    ]),
  ]);
}

/**
 * Embalagem To Go (bandeja com tampa articulada): fundo L×P, quatro paredes de altura A,
 * tampa presa na parede de trás e lingueta de fecho na frente da tampa.
 * Representação simplificada: os cantos sanfonados das artes não entram no 3D.
 */
export function foldToGo(spec: Spec): FoldNode {
  const { largura: L, altura: A, profundidade: P } = spec;
  const lg = Math.min(25, A * 0.5);
  const no = (nome: string, poly: [number, number][], origem: [number, number], eixo: FoldNode["eixo"], angulo: number, etapa: number, filhos: FoldNode[] = []): FoldNode => ({
    nome, poly, origem, eixo, angulo, etapa, filhos,
  });
  // raiz = parede de trás (em pé), como o corpo do fundo cartucho
  return no("parede de trás", rect(L, A), [0, 0], null, 0, 0, [
    no("fundo", [[0, 0], [L, 0], [L, -P], [0, -P]], [0, 0], "x", 90, 0, [
      no("parede da frente", [[0, 0], [L, 0], [L, -A], [0, -A]], [0, -P], "x", 90, 1),
      no("parede esquerda", [[0, 0], [-A, 0], [-A, -P], [0, -P]], [0, 0], "y", -90, 1),
      no("parede direita", [[0, 0], [A, 0], [A, -P], [0, -P]], [L, 0], "y", 90, 1),
    ]),
    no("tampa", rect(L, P), [0, A], "x", -90, 2, [
      no("lingueta", rect(L, lg), [0, P], "x", -90, 3),
    ]),
  ]);
}

export const FOLD_MODELS: Record<string, (s: Spec) => FoldNode> = {
  "fundo-cartucho": foldFundoCartucho,
  "to-go": foldToGo,
};

/** Modelo 3D de um slug: exato ou pelo prefixo (to-go-p-slim → to-go). */
export const foldDoModelo = (slug: string) => FOLD_MODELS[slug] ?? FOLD_MODELS[Object.keys(FOLD_MODELS).find((k) => slug.startsWith(k + "-")) ?? ""];

/** Fração de dobra de uma etapa, dado o progresso geral 0..1. */
export function fracaoEtapa(progresso: number, etapa: number) {
  const ini = etapa / ETAPAS;
  return Math.min(1, Math.max(0, (progresso - ini) * ETAPAS));
}

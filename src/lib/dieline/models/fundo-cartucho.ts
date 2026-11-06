/**
 * Caixa fundo cartucho (tuck end reverso): 4 painéis + aba de cola,
 * tampa com lingueta no topo do painel de trás, tampa com lingueta no fundo do painel da frente,
 * abas de pó nas laterais (topo e fundo).
 *
 * Layout horizontal (x cresce para a direita):
 *   [aba de cola] | frente (L) | lateral (P) | trás (L) | lateral (P)
 * y = 0 é o vinco superior do corpo; y = H é o vinco inferior.
 */
import * as F from "../allowances";
import { line, normalize, p, polyline, round, toPolygon } from "../geom";
import { offsetPolygon } from "../offset";
import type { Dieline, Dimension, Path, Spec } from "../types";

export function fundoCartucho(spec: Spec): Dieline {
  const { largura: L, altura: A, profundidade: P, espessura: t } = spec;

  const wF = F.painel(L, t);
  const wS1 = F.painel(P, t);
  const wB = F.painel(L, t);
  const wS2 = F.painelFinal(P, t);
  const H = F.alturaCorpo(A, t);
  const lidD = F.profundidadeTampa(P, t);
  const tuck = F.alturaLingueta(P, A);
  const ti = F.recuoLingueta(t);
  const tr = F.raioLingueta(tuck);
  const g = F.larguraAbaCola(P);
  const gc = F.chanfroAbaCola(g);
  const dh = F.alturaAbaPo(L, P, t);
  const dsL = F.chanfroAbaPoLadoTampa(dh);
  const dsO = F.chanfroAbaPoOutroLado;

  const c0 = 0;
  const c1 = c0 + wF;
  const c2 = c1 + wS1;
  const c3 = c2 + wB;
  const c4 = c3 + wS2;
  const yT = 0;
  const yB = H;

  // Contorno de corte, em um único caminho fechado (sentido horário na tela).
  const contorno = [
    p(c0, yT), // início: canto superior do vinco aba de cola | frente (sem arredondar)
    // aba de cola (esquerda)
    p(c0 - g, yT + gc),
    p(c0 - g, yB - gc),
    p(c0, yB),
    // tampa de fundo + lingueta (presa à frente)
    p(c0, yB + lidD),
    p(c0 + ti, yB + lidD),
    { ...p(c0 + ti, yB + lidD + tuck), r: tr },
    { ...p(c1 - ti, yB + lidD + tuck), r: tr },
    p(c1 - ti, yB + lidD),
    p(c1, yB + lidD),
    p(c1, yB),
    // aba de pó inferior da lateral 1 (lado da tampa à esquerda)
    p(c1 + dsL, yB + dh),
    p(c2 - dsO, yB + dh),
    p(c2, yB),
    // base do painel de trás (corte)
    p(c3, yB),
    // aba de pó inferior da lateral 2
    p(c3 + dsO, yB + dh),
    p(c4 - dsO, yB + dh),
    p(c4, yB),
    // borda livre da lateral 2
    p(c4, yT),
    // aba de pó superior da lateral 2 (tampa de cima fica à esquerda, em c3)
    p(c4 - dsO, yT - dh),
    p(c3 + dsL, yT - dh),
    p(c3, yT),
    // tampa de topo + lingueta (presa ao painel de trás)
    p(c3, yT - lidD),
    p(c3 - ti, yT - lidD),
    { ...p(c3 - ti, yT - lidD - tuck), r: tr },
    { ...p(c2 + ti, yT - lidD - tuck), r: tr },
    p(c2 + ti, yT - lidD),
    p(c2, yT - lidD),
    p(c2, yT),
    // aba de pó superior da lateral 1 (tampa de cima fica à direita, em c2)
    p(c2 - dsL, yT - dh),
    p(c1 + dsO, yT - dh),
    p(c1, yT),
    // topo do painel da frente (corte) fecha em (c0, yT)
  ];
  const cutPrims = polyline(contorno, true);
  const outline = toPolygon(cutPrims);

  const vincos: Path[] = [
    // verticais entre painéis
    ...[c0, c1, c2, c3].map((x) => ({ kind: "vinco" as const, prims: [line(p(x, yT), p(x, yB))] })),
    // dobradiças superiores: aba de pó lat.1, tampa de topo, aba de pó lat.2
    { kind: "vinco", prims: [line(p(c1, yT), p(c2, yT))] },
    { kind: "vinco", prims: [line(p(c2, yT), p(c3, yT))] },
    { kind: "vinco", prims: [line(p(c3, yT), p(c4, yT))] },
    // dobradiças inferiores: tampa de fundo, aba de pó lat.1, aba de pó lat.2
    { kind: "vinco", prims: [line(p(c0, yB), p(c1, yB))] },
    { kind: "vinco", prims: [line(p(c1, yB), p(c2, yB))] },
    { kind: "vinco", prims: [line(p(c3, yB), p(c4, yB))] },
    // vincos das linguetas
    { kind: "vinco", prims: [line(p(c2 + ti, yT - lidD), p(c3 - ti, yT - lidD))] },
    { kind: "vinco", prims: [line(p(c0 + ti, yB + lidD), p(c1 - ti, yB + lidD))] },
  ];

  const paths: Path[] = [{ kind: "corte", prims: cutPrims, closed: true }, ...vincos];

  const bleed = spec.sangria ? offsetPolygon(outline, F.SANGRIA) : [];
  const glue = spec.areasCola
    ? [
        [
          p(c0 - F.RECUO_COLA, yT + gc + F.RECUO_COLA),
          p(c0 - g + F.RECUO_COLA, yT + gc + F.RECUO_COLA),
          p(c0 - g + F.RECUO_COLA, yB - gc - F.RECUO_COLA),
          p(c0 - F.RECUO_COLA, yB - gc - F.RECUO_COLA),
          p(c0 - F.RECUO_COLA, yT + gc + F.RECUO_COLA),
        ],
      ]
    : [];

  const fmt = (n: number) => round(n, 10).toLocaleString("pt-BR");
  const below = yB + lidD + tuck;
  const dims: Dimension[] = [
    { a: p(c0, below), b: p(c1, below), offset: 8, axis: "x", label: fmt(wF) },
    { a: p(c1, below), b: p(c2, below), offset: 8, axis: "x", label: fmt(wS1) },
    { a: p(c2, below), b: p(c3, below), offset: 8, axis: "x", label: fmt(wB) },
    { a: p(c3, below), b: p(c4, below), offset: 8, axis: "x", label: fmt(wS2) },
    { a: p(c4, yT), b: p(c4, yB), offset: 8, axis: "y", label: fmt(H) },
    { a: p(c4, yT - lidD - tuck), b: p(c4, yT), offset: 8, axis: "y", label: fmt(lidD + tuck) },
  ];

  const d = normalize({
    model: spec.model,
    paths,
    outline,
    bleed,
    glue,
    dims,
    info: {
      painelFrente: wF,
      painelLateral: wS1,
      painelTras: wB,
      painelLateralFinal: wS2,
      alturaCorpo: H,
      profundidadeTampa: lidD,
      lingueta: tuck,
      abaCola: g,
      abaPo: dh,
    },
  });
  // cotas totais depois de normalizar (o contorno começa em 0,0)
  d.dims.push(
    { a: p(0, d.bbox.h), b: p(d.bbox.w, d.bbox.h), offset: 18, axis: "x", label: fmt(d.bbox.w) },
    { a: p(d.bbox.w, 0), b: p(d.bbox.w, d.bbox.h), offset: 20, axis: "y", label: fmt(d.bbox.h) },
  );
  return d;
}

/**
 * FOLGAS E PROPORÇÕES — único lugar com as regras empíricas de construção.
 *
 * ⚠ Valores de partida, escritos a partir de prática geral de embalagem cartonada
 *   (medida interna + compensação pela espessura do cartão). PRECISAM ser revisados
 *   pela produção da ProFood e confirmados em protótipo físico antes de liberar o modelo.
 *   Cada função recebe t = espessura do cartão em mm.
 */

/** Painel de vinco a vinco a partir da medida interna. */
export const painel = (interna: number, t: number) => interna + t;

/** Último painel (o que cola na aba de cola) fica um pouco menor para não "embarrigar". */
export const painelFinal = (interna: number, t: number) => interna + t * 0.5;

/** Altura de vinco a vinco do corpo: medida interna + espessura da tampa + da aba de pó. */
export const alturaCorpo = (interna: number, t: number) => interna + 2 * t;

/** Profundidade da tampa (do vinco da tampa ao vinco da lingueta). */
export const profundidadeTampa = (profInterna: number, t: number) => profInterna + t;

/** Aba de cola: até 15 mm, nunca mais larga que a lateral onde cola menos 3 mm. */
export const larguraAbaCola = (profInterna: number) => Math.max(8, Math.min(15, profInterna - 3));

/** Chanfro das pontas da aba de cola. */
export const chanfroAbaCola = (aba: number) => Math.max(3, aba * 0.4);

/** Lingueta (tuck): ~60% da profundidade, entre 10 e 20 mm, e nunca mais da metade da altura. */
export const alturaLingueta = (profInterna: number, alturaInterna: number) =>
  Math.min(Math.max(10, profInterna * 0.6), 20, alturaInterna / 2);

/** Recuo lateral da lingueta em relação à tampa (cada lado). */
export const recuoLingueta = (t: number) => 1 + t;

/** Raio dos cantos da lingueta. */
export const raioLingueta = (lingueta: number) => Math.min(lingueta * 0.5, 8);

/** Aba de pó (dust flap): não pode passar do meio da caixa nem da profundidade. */
export const alturaAbaPo = (larguraInterna: number, profInterna: number, t: number) =>
  Math.max(6, Math.min(larguraInterna / 2 - t, profInterna * 0.85, 30));

/** Chanfro da aba de pó do lado da tampa (folga para não prender na lateral da tampa). */
export const chanfroAbaPoLadoTampa = (abaPo: number) => Math.min(abaPo * 0.3, 6);
/** Chanfro da aba de pó do outro lado. */
export const chanfroAbaPoOutroLado = 2;

/** Sangria padrão. */
export const SANGRIA = 3;

/** Recuo da área de cola em relação à borda da aba. */
export const RECUO_COLA = 1.5;

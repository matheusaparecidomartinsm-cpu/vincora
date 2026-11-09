/** Todas as medidas em milímetros. Sistema de coordenadas: x para a direita, y para baixo (como SVG). */

export type Pt = { x: number; y: number };

/** Reta de a até b. */
export type Line = { t: "line"; a: Pt; b: Pt };
/** Arco de círculo (centro c, raio r) percorrido do ângulo a0 ao a1, em graus.
 *  a1 > a0 = sentido horário na tela (y para baixo); a1 < a0 = anti-horário. |a1 - a0| <= 360. */
export type Arc = { t: "arc"; c: Pt; r: number; a0: number; a1: number };
export type Prim = Line | Arc;

export type LineKind = "corte" | "vinco" | "serrilha";

/** Um caminho contínuo (aberto ou fechado) de um tipo de linha. */
export type Path = { kind: LineKind; prims: Prim[]; closed?: boolean };

export type Dimension = {
  a: Pt;
  b: Pt;
  /** deslocamento perpendicular da linha de cota, em mm (positivo = para baixo/direita) */
  offset: number;
  axis: "x" | "y";
  label: string;
};

export type Polygon = Pt[];

export type Dieline = {
  model: string;
  paths: Path[];
  /** contorno de corte externo como polígono (arcos discretizados) — base para sangria */
  outline: Polygon;
  bleed: Polygon[];
  glue: Polygon[];
  dims: Dimension[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number };
  /** medidas de vinco a vinco efetivamente usadas, para o resumo e o carimbo */
  info: Record<string, number>;
};

export type Spec = {
  model: string;
  largura: number;
  altura: number;
  profundidade: number;
  espessura: number;
  sangria: boolean;
  areasCola: boolean;
  /** Só para bandejas com parede inclinada (To Go): medidas internas na boca, em mm. */
  topo?: { largura: number; profundidade: number; lingueta?: number };
};

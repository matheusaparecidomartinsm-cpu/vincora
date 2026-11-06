/**
 * AMOSTRA VISUAL — só para a vitrine de design e para miniaturas.
 * Não é a geometria de produção (sem folgas, linguetas simplificadas).
 * A geometria real vive em lib/dieline/models/* (milestone M1).
 */
export type LineKind = "corte" | "vinco" | "serrilha" | "sangria";
export type Seg = { kind: LineKind; d: string };
export type Dim = { x1: number; y1: number; x2: number; y2: number; label: string; offset: number; axis: "x" | "y" };
export type GlueArea = { x: number; y: number; w: number; h: number };
export type SampleDieline = { segs: Seg[]; dims: Dim[]; glue: GlueArea[]; bbox: { w: number; h: number } };

export function sampleTuckBox(L: number, A: number, P: number, opts: { sangria?: boolean; cola?: boolean } = {}): SampleDieline {
  const g = 15; // aba de cola
  const xs = [0, g, g + L, g + L + P, g + 2 * L + P, g + 2 * L + 2 * P];
  const flap = P; // altura das abas topo/fundo
  const tuck = Math.min(15, P * 0.4);
  const y0 = flap + tuck;
  const y1 = y0 + A;
  const W = xs[5];
  const H = y1 + flap + tuck;
  const segs: Seg[] = [];

  // contorno de corte
  const outline = [
    `M ${xs[0]} ${y0 + 6}`, `L ${xs[1]} ${y0}`,
    // topo: painel L (frente) recebe tampa + lingueta
    `L ${xs[1]} ${tuck}`, `Q ${xs[1]} 0 ${xs[1] + tuck} 0`, `L ${xs[2] - tuck} 0`, `Q ${xs[2]} 0 ${xs[2]} ${tuck}`,
    `L ${xs[2]} ${y0}`,
    // dust flap lateral
    `L ${xs[2] + 3} ${y0 - flap * 0.8}`, `L ${xs[3] - 6} ${y0 - flap * 0.8}`, `L ${xs[3]} ${y0}`,
    `L ${xs[4]} ${y0}`,
    `L ${xs[4] + 3} ${y0 - flap * 0.8}`, `L ${xs[5] - 6} ${y0 - flap * 0.8}`, `L ${xs[5]} ${y0}`,
    `L ${xs[5]} ${y1}`,
    `L ${xs[5] - 6} ${y1 + flap * 0.8}`, `L ${xs[4] + 3} ${y1 + flap * 0.8}`, `L ${xs[4]} ${y1}`,
    // fundo: painel L (costas) com tampa + lingueta
    `L ${xs[4]} ${H - tuck}`, `Q ${xs[4]} ${H} ${xs[4] - tuck} ${H}`, `L ${xs[3] + tuck} ${H}`, `Q ${xs[3]} ${H} ${xs[3]} ${H - tuck}`,
    `L ${xs[3]} ${y1}`,
    `L ${xs[3] - 6} ${y1 + flap * 0.8}`, `L ${xs[2] + 3} ${y1 + flap * 0.8}`, `L ${xs[2]} ${y1}`,
    `L ${xs[1]} ${y1}`, `L ${xs[0]} ${y1 - 6}`, "Z",
  ].join(" ");
  segs.push({ kind: "corte", d: outline });

  // vincos verticais entre painéis
  for (const x of xs.slice(1, 5)) segs.push({ kind: "vinco", d: `M ${x} ${y0} L ${x} ${y1}` });
  // vincos horizontais (topo/fundo)
  segs.push({ kind: "vinco", d: `M ${xs[1]} ${y0} L ${xs[5]} ${y0}` });
  segs.push({ kind: "vinco", d: `M ${xs[1]} ${y1} L ${xs[5]} ${y1}` });
  segs.push({ kind: "vinco", d: `M ${xs[1]} ${tuck} L ${xs[2]} ${tuck}` });
  segs.push({ kind: "vinco", d: `M ${xs[3]} ${H - tuck} L ${xs[4]} ${H - tuck}` });
  // serrilha de exemplo (picote de abertura)
  segs.push({ kind: "serrilha", d: `M ${xs[3] + 8} ${y0 + A * 0.3} L ${xs[4] - 8} ${y0 + A * 0.3}` });

  if (opts.sangria) {
    const b = 3;
    segs.push({ kind: "sangria", d: `M ${-b} ${-b} H ${W + b} V ${H + b} H ${-b} Z` });
  }

  const glue: GlueArea[] = opts.cola ? [{ x: xs[0] + 2, y: y0 + 8, w: g - 4, h: A - 16 }] : [];

  const dims: Dim[] = [
    { x1: xs[1], y1: y1, x2: xs[2], y2: y1, label: fmt(L), offset: flap + tuck + 14, axis: "x" },
    { x1: xs[2], y1: y1, x2: xs[3], y2: y1, label: fmt(P), offset: flap + tuck + 14, axis: "x" },
    { x1: xs[5], y1: y0, x2: xs[5], y2: y1, label: fmt(A), offset: 14, axis: "y" },
    { x1: 0, y1: H, x2: W, y2: H, label: fmt(W), offset: 30, axis: "x" },
  ];

  return { segs, dims, glue, bbox: { w: W, h: H } };
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

import { start } from "../geom";
import type { Dieline, Dimension, Polygon, Prim } from "../types";

const n = (v: number) => +v.toFixed(3);

/** Primitivas -> atributo `d` do SVG (mm). */
export function primsToD(prims: Prim[], closed = false): string {
  if (!prims.length) return "";
  const s = start(prims[0]);
  let d = `M${n(s.x)} ${n(s.y)}`;
  for (const pr of prims) {
    if (pr.t === "line") d += ` L${n(pr.b.x)} ${n(pr.b.y)}`;
    else {
      const sweep = pr.a1 > pr.a0 ? 1 : 0;
      const large = Math.abs(pr.a1 - pr.a0) > 180 ? 1 : 0;
      const e = { x: pr.c.x + pr.r * Math.cos((pr.a1 * Math.PI) / 180), y: pr.c.y + pr.r * Math.sin((pr.a1 * Math.PI) / 180) };
      d += ` A${n(pr.r)} ${n(pr.r)} 0 ${large} ${sweep} ${n(e.x)} ${n(e.y)}`;
    }
  }
  return closed ? d + " Z" : d;
}

export const polyToD = (poly: Polygon) => poly.map((q, i) => `${i ? "L" : "M"}${n(q.x)} ${n(q.y)}`).join(" ") + " Z";

/** Cores de produção (puras), iguais às cores especiais do PDF. */
export const PROD_COLORS = { corte: "#FF0000", vinco: "#00A000", serrilha: "#FF00FF", sangria: "#00A0E0", cola: "#FFD966", cota: "#000000" };

export function dimGeometry(d: Dimension) {
  if (d.axis === "x") {
    const y = d.a.y + d.offset;
    return { ext: [[d.a.x, d.a.y + 1.5, d.a.x, y + 2], [d.b.x, d.b.y + 1.5, d.b.x, y + 2]], line: [d.a.x, y, d.b.x, y], text: { x: (d.a.x + d.b.x) / 2, y: y - 1.2, rot: 0 } };
  }
  const x = d.a.x + d.offset;
  return { ext: [[d.a.x + 1.5, d.a.y, x + 2, d.a.y], [d.b.x + 1.5, d.b.y, x + 2, d.b.y]], line: [x, d.a.y, x, d.b.y], text: { x: x + 1.2, y: (d.a.y + d.b.y) / 2, rot: 90 } };
}

/** SVG autônomo, 1:1 em milímetros, com uma camada (grupo) por tipo de linha. */
export function toSVG(dl: Dieline, opts: { cotas?: boolean; titulo?: string } = {}): string {
  const m = 30; // margem para cotas e sangria
  const W = dl.bbox.w + 2 * m;
  const H = dl.bbox.h + 2 * m;
  const layer = (id: string, body: string) =>
    body ? `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}">\n${body}\n</g>` : "";
  const byKind = (k: string) =>
    dl.paths
      .filter((pa) => pa.kind === k)
      .map((pa) => `<path d="${primsToD(pa.prims, pa.closed)}"/>`)
      .join("\n");
  const stroke = (c: string) => `fill="none" stroke="${c}" stroke-width="0.25" stroke-linejoin="round"`;

  const cotas = opts.cotas
    ? dl.dims
        .map((d) => {
          const g = dimGeometry(d);
          const [x1, y1, x2, y2] = g.line;
          const t = g.text;
          return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>${g.ext
            .map(([a, b, c, e]) => `<line x1="${n(a)}" y1="${n(b)}" x2="${n(c)}" y2="${n(e)}"/>`)
            .join("")}<text x="${n(t.x)}" y="${n(t.y)}" ${t.rot ? `transform="rotate(${t.rot} ${n(t.x)} ${n(t.y)})"` : ""} text-anchor="middle" stroke="none" fill="${PROD_COLORS.cota}" font-size="3" font-family="Helvetica, Arial, sans-serif">${d.label}</text>`;
        })
        .join("\n")
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
  width="${n(W)}mm" height="${n(H)}mm" viewBox="${-m} ${-m} ${n(W)} ${n(H)}">
<title>${opts.titulo ?? "Faca"}</title>
${layer("COLA", dl.glue.map((g) => `<path d="${polyToD(g)}" fill="${PROD_COLORS.cola}" fill-opacity="0.6" stroke="none"/>`).join("\n"))}
${layer("SANGRIA", dl.bleed.map((b) => `<path d="${polyToD(b)}" ${stroke(PROD_COLORS.sangria)} stroke-dasharray="1 1"/>`).join("\n"))}
${layer("CORTE", byKind("corte") && `<g ${stroke(PROD_COLORS.corte)}>${byKind("corte")}</g>`)}
${layer("VINCO", byKind("vinco") && `<g ${stroke(PROD_COLORS.vinco)}>${byKind("vinco")}</g>`)}
${layer("SERRILHA", byKind("serrilha") && `<g ${stroke(PROD_COLORS.serrilha)}>${byKind("serrilha")}</g>`)}
${layer("COTAS", cotas && `<g stroke="${PROD_COLORS.cota}" stroke-width="0.15">${cotas}</g>`)}
</svg>
`;
}

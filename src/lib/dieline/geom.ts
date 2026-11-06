import type { Arc, Dieline, Line, Path, Polygon, Prim, Pt } from "./types";

export const p = (x: number, y: number): Pt => ({ x, y });
export const line = (a: Pt, b: Pt): Line => ({ t: "line", a, b });
export const arc = (c: Pt, r: number, a0: number, a1: number): Arc => ({ t: "arc", c, r, a0, a1 });

const rad = (deg: number) => (deg * Math.PI) / 180;
export const arcPoint = (a: Arc, deg: number): Pt => p(a.c.x + a.r * Math.cos(rad(deg)), a.c.y + a.r * Math.sin(rad(deg)));
export const start = (pr: Prim): Pt => (pr.t === "line" ? pr.a : arcPoint(pr, pr.a0));
export const end = (pr: Prim): Pt => (pr.t === "line" ? pr.b : arcPoint(pr, pr.a1));

/**
 * Constrói um caminho a partir de uma sequência de vértices; `round` em um vértice
 * substitui o canto por um arco de raio r (só para cantos de 90°, que é o que os modelos usam).
 */
export function polyline(pts: (Pt & { r?: number })[], closed = false): Prim[] {
  const out: Prim[] = [];
  const n = pts.length;
  const get = (i: number) => pts[(i + n) % n];
  let cursor: Pt = pts[0];
  const last = closed ? n : n - 1;
  for (let i = 1; i <= last; i++) {
    const cur = get(i);
    const r = cur.r ?? 0;
    const isEnd = !closed && i === n - 1;
    if (r > 0 && !isEnd && !(closed && i === n)) {
      const prev = get(i - 1);
      const next = get(i + 1);
      const d1 = unit(sub(cur, prev));
      const d2 = unit(sub(next, cur));
      const t1 = p(cur.x - d1.x * r, cur.y - d1.y * r);
      const t2 = p(cur.x + d2.x * r, cur.y + d2.y * r);
      // centro: a partir de t1, perpendicular ao primeiro segmento, para o lado da curva
      const cross = d1.x * d2.y - d1.y * d2.x; // >0 = vira à direita na tela (horário)
      const nrm = cross > 0 ? p(-d1.y, d1.x) : p(d1.y, -d1.x);
      const c = p(t1.x + nrm.x * r, t1.y + nrm.y * r);
      out.push(line(cursor, t1));
      const a0 = deg(Math.atan2(t1.y - c.y, t1.x - c.x));
      let a1 = deg(Math.atan2(t2.y - c.y, t2.x - c.x));
      // horário na tela (cross>0) => a1 > a0; anti-horário => a1 < a0
      if (cross > 0) while (a1 <= a0) a1 += 360;
      else while (a1 >= a0) a1 -= 360;
      out.push(arc(c, r, a0, a1));
      cursor = t2;
    } else {
      out.push(line(cursor, cur));
      cursor = cur;
    }
  }
  return out.filter((pr) => pr.t === "arc" || dist(pr.a, pr.b) > 1e-6);
}

const deg = (r: number) => (r * 180) / Math.PI;
const sub = (a: Pt, b: Pt) => p(a.x - b.x, a.y - b.y);
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
function unit(v: Pt): Pt {
  const l = Math.hypot(v.x, v.y) || 1;
  return p(v.x / l, v.y / l);
}

/** Discretiza arcos em segmentos de ~1 mm, respeitando o sentido de percurso. */
export function toPolygon(prims: Prim[]): Polygon {
  const pts: Pt[] = [];
  for (const pr of prims) {
    if (pr.t === "line") {
      if (!pts.length) pts.push(pr.a);
      pts.push(pr.b);
    } else {
      const steps = Math.max(4, Math.ceil((Math.abs(pr.a1 - pr.a0) * Math.PI * pr.r) / 180));
      for (let i = 1; i <= steps; i++) pts.push(arcPoint(pr, pr.a0 + ((pr.a1 - pr.a0) * i) / steps));
    }
  }
  return pts;
}

export function bboxOf(polys: Polygon[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polys)
    for (const q of poly) {
      minX = Math.min(minX, q.x); minY = Math.min(minY, q.y);
      maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y);
    }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Translada tudo para que o canto superior esquerdo do contorno de corte fique em (0,0). */
export function normalize(d: Omit<Dieline, "bbox">): Dieline {
  const bb = bboxOf([d.outline]);
  const dx = -bb.minX, dy = -bb.minY;
  const mv = (q: Pt) => p(round(q.x + dx), round(q.y + dy));
  const mvPrim = (pr: Prim): Prim =>
    pr.t === "line" ? { ...pr, a: mv(pr.a), b: mv(pr.b) } : { ...pr, c: mv(pr.c) };
  const paths: Path[] = d.paths.map((pa) => ({ ...pa, prims: pa.prims.map(mvPrim) }));
  const outline = d.outline.map(mv);
  return {
    ...d,
    paths,
    outline,
    bleed: d.bleed.map((poly) => poly.map(mv)),
    glue: d.glue.map((poly) => poly.map(mv)),
    dims: d.dims.map((dm) => ({ ...dm, a: mv(dm.a), b: mv(dm.b) })),
    bbox: bboxOf([outline]),
  };
}

export const round = (n: number, k = 1000) => Math.round(n * k) / k;

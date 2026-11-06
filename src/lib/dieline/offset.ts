import ClipperLib from "clipper-lib";
import type { Polygon } from "./types";

const SCALE = 1000; // clipper trabalha com inteiros: 1 unidade = 1 µm

/** Desloca um polígono (positivo = para fora) com cantos arredondados. */
export function offsetPolygon(poly: Polygon, delta: number): Polygon[] {
  const path = poly.map((q) => ({ X: Math.round(q.x * SCALE), Y: Math.round(q.y * SCALE) }));
  const co = new ClipperLib.ClipperOffset(2, 0.05 * SCALE);
  co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out: { X: number; Y: number }[][] = [];
  co.Execute(out, delta * SCALE);
  return out.map((pth) => {
    const pts = pth.map((q) => ({ x: q.X / SCALE, y: q.Y / SCALE }));
    return [...pts, pts[0]];
  });
}

/** Área com sinal (positiva = horário na tela). */
export function signedArea(poly: Polygon) {
  let a = 0;
  for (let i = 0; i < poly.length - 1; i++) a += poly[i].x * poly[i + 1].y - poly[i + 1].x * poly[i].y;
  return a / 2;
}

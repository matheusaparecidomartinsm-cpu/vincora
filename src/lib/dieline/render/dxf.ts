import type { Dieline, LineKind } from "../types";

/**
 * DXF R12 (AC1009) em ASCII, só com LINE e ARC — o formato mais aceito por
 * plotters de recorte (Silhouette, Cricut), CAD e CorelDRAW.
 * Unidades: milímetros. Eixo Y invertido (DXF é y para cima).
 * Só linhas de produção: CORTE, VINCO, SERRILHA (sem cotas, sangria ou cola).
 */
const LAYERS: Record<LineKind, { name: string; color: number }> = {
  corte: { name: "CORTE", color: 1 }, // vermelho
  vinco: { name: "VINCO", color: 3 }, // verde
  serrilha: { name: "SERRILHA", color: 6 }, // magenta
};

const f = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(4);
const norm = (a: number) => ((a % 360) + 360) % 360;

export function toDXF(dl: Dieline): string {
  const H = dl.bbox.h;
  const out: string[] = [];
  const g = (code: number, val: string | number) => out.push(String(code), String(val));

  g(0, "SECTION"); g(2, "HEADER");
  g(9, "$ACADVER"); g(1, "AC1009");
  g(9, "$INSBASE"); g(10, f(0)); g(20, f(0)); g(30, f(0));
  g(9, "$EXTMIN"); g(10, f(0)); g(20, f(0)); g(30, f(0));
  g(9, "$EXTMAX"); g(10, f(dl.bbox.w)); g(20, f(H)); g(30, f(0));
  g(9, "$MEASUREMENT"); g(70, 1);
  g(9, "$INSUNITS"); g(70, 4);
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "TABLES");
  g(0, "TABLE"); g(2, "LTYPE"); g(70, 1);
  g(0, "LTYPE"); g(2, "CONTINUOUS"); g(70, 0); g(3, "Solid line"); g(72, 65); g(73, 0); g(40, f(0));
  g(0, "ENDTAB");
  const kinds = Object.keys(LAYERS) as LineKind[];
  g(0, "TABLE"); g(2, "LAYER"); g(70, kinds.length);
  for (const k of kinds) {
    g(0, "LAYER"); g(2, LAYERS[k].name); g(70, 0); g(62, LAYERS[k].color); g(6, "CONTINUOUS");
  }
  g(0, "ENDTAB");
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "ENTITIES");
  for (const path of dl.paths) {
    const layer = LAYERS[path.kind].name;
    for (const pr of path.prims) {
      if (pr.t === "line") {
        g(0, "LINE"); g(8, layer);
        g(10, f(pr.a.x)); g(20, f(H - pr.a.y)); g(30, f(0));
        g(11, f(pr.b.x)); g(21, f(H - pr.b.y)); g(31, f(0));
      } else {
        // Com y invertido os ângulos trocam de sinal. DXF desenha sempre anti-horário (y para cima).
        const [s, e] = pr.a1 > pr.a0 ? [-pr.a1, -pr.a0] : [-pr.a0, -pr.a1];
        g(0, "ARC"); g(8, layer);
        g(10, f(pr.c.x)); g(20, f(H - pr.c.y)); g(30, f(0));
        g(40, f(pr.r)); g(50, f(norm(s))); g(51, f(norm(e)));
      }
    }
  }
  g(0, "ENDSEC");
  g(0, "EOF");
  return out.join("\r\n") + "\r\n";
}

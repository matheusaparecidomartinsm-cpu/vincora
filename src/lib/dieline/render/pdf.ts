import {
  PDFDocument,
  PDFName,
  PDFOperator,
  PDFOperatorNames as Op,
  PDFString,
  StandardFonts,
  appendBezierCurve,
  closePath,
  degrees,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setDashPattern,
  setFillingRgbColor,
  setLineJoin,
  setLineWidth,
  setStrokingGrayscaleColor,
  setStrokingRgbColor,
  stroke,
  LineJoinStyle,
  type PDFFont,
  type PDFPage,
  type PDFRef,
} from "pdf-lib";
import { start } from "../geom";
import { PDF_COTAS, PDF_MARGIN, smallestPaper } from "../paper";
import type { Dieline, Polygon, Prim, Spec } from "../types";
import { dimGeometry } from "./svg";

const PT = 72 / 25.4; // pontos por mm

/** Cores especiais: nome da tinta + equivalente CMYK para visualização. */
const SPOTS = {
  corte: { name: "CORTE", cmyk: [0, 1, 1, 0] },
  vinco: { name: "VINCO", cmyk: [1, 0, 1, 0] },
  serrilha: { name: "SERRILHA", cmyk: [0, 1, 0, 0] },
} as const;
type SpotKey = keyof typeof SPOTS;

const LAYERS = ["CORTE", "VINCO", "SERRILHA", "SANGRIA", "COLA", "INFO"] as const;
type Layer = (typeof LAYERS)[number];

export type PdfMeta = {
  titulo: string;
  modeloNome: string;
  validado?: boolean;
  spec: Spec;
  motorVersao: string;
  data: Date;
  os?: string;
  cliente?: string;
};

/**
 * PDF vetorial 1:1 numa folha ISO (ou tamanho plotter): faca e vinco em cores especiais (Separation),
 * cada tipo de linha numa camada (Optional Content), cotas, régua de 50 mm e carimbo.
 */
export async function toPDF(dl: Dieline, meta: PdfMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.titulo);
  doc.setCreator("Vincora");
  doc.setProducer("Vincora — motor " + meta.motorVersao);

  const paper = smallestPaper(dl.bbox.w, dl.bbox.h);
  const pw = paper.landscape ? paper.h : paper.w;
  const ph = paper.landscape ? paper.w : paper.h;
  const page = doc.addPage([pw * PT, ph * PT]);
  const ctx = doc.context;

  // --- cores especiais
  const csNames: Record<SpotKey, string> = { corte: "CsCorte", vinco: "CsVinco", serrilha: "CsSerrilha" };
  const csDict: Record<string, PDFRef> = {};
  for (const k of Object.keys(SPOTS) as SpotKey[]) {
    const fn = ctx.register(ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: [...SPOTS[k].cmyk], N: 1 }));
    csDict[csNames[k]] = ctx.register(ctx.obj([PDFName.of("Separation"), PDFName.of(SPOTS[k].name), PDFName.of("DeviceCMYK"), fn]));
  }

  // --- camadas (OCG)
  const ocRefs = {} as Record<Layer, PDFRef>;
  for (const l of LAYERS) ocRefs[l] = ctx.register(ctx.obj({ Type: "OCG", Name: PDFString.of(l) }));
  const all = LAYERS.map((l) => ocRefs[l]);
  doc.catalog.set(PDFName.of("OCProperties"), ctx.obj({ OCGs: all, D: { Name: PDFString.of("Camadas"), Order: all, ON: all } }));

  page.node.normalize();
  const res = page.node.Resources()!;
  res.set(PDFName.of("ColorSpace"), ctx.obj(csDict));
  res.set(PDFName.of("Properties"), ctx.obj(Object.fromEntries(LAYERS.map((l) => [`Oc${l}`, ocRefs[l]]))));

  // faca posicionada com margem à esquerda e em cima
  const ox = PDF_MARGIN;
  const oy = PDF_MARGIN + 12; // espaço para a régua acima da faca
  const X = (x: number) => (ox + x) * PT;
  const Y = (y: number) => (ph - (oy + y)) * PT;
  const ops = (...o: PDFOperator[]) => page.pushOperators(...o);
  const beginLayer = (l: Layer) => ops(PDFOperator.of(Op.BeginMarkedContentSequence, [PDFName.of("OC"), PDFName.of(`Oc${l}`)]));
  const endLayer = () => ops(PDFOperator.of(Op.EndMarkedContent));

  const tracePrims = (prims: Prim[], closed?: boolean) => {
    const s = start(prims[0]);
    ops(moveTo(X(s.x), Y(s.y)));
    for (const pr of prims) {
      if (pr.t === "line") ops(lineTo(X(pr.b.x), Y(pr.b.y)));
      else for (const b of arcToBeziers(pr)) ops(appendBezierCurve(X(b[0]), Y(b[1]), X(b[2]), Y(b[3]), X(b[4]), Y(b[5])));
    }
    if (closed) ops(closePath());
  };
  const tracePoly = (poly: Polygon) => {
    ops(moveTo(X(poly[0].x), Y(poly[0].y)));
    for (const q of poly.slice(1)) ops(lineTo(X(q.x), Y(q.y)));
    ops(closePath());
  };

  // COLA (atrás de tudo)
  if (dl.glue.length) {
    beginLayer("COLA");
    ops(pushGraphicsState(), setFillingRgbColor(1, 0.85, 0.4));
    for (const g of dl.glue) {
      tracePoly(g);
      ops(fill());
    }
    ops(popGraphicsState());
    endLayer();
  }

  // SANGRIA
  if (dl.bleed.length) {
    beginLayer("SANGRIA");
    ops(pushGraphicsState(), setStrokingRgbColor(0, 0.63, 0.88), setLineWidth(0.35), setDashPattern([2, 2], 0));
    for (const b of dl.bleed) {
      tracePoly(b);
      ops(stroke());
    }
    ops(popGraphicsState());
    endLayer();
  }

  // CORTE, VINCO, SERRILHA em cores especiais, traço contínuo de 0,5 pt
  for (const k of ["corte", "vinco", "serrilha"] as SpotKey[]) {
    const paths = dl.paths.filter((pa) => pa.kind === k);
    if (!paths.length) continue;
    beginLayer(SPOTS[k].name as Layer);
    ops(
      pushGraphicsState(),
      PDFOperator.of(Op.StrokingColorspace, [PDFName.of(csNames[k])]),
      PDFOperator.of(Op.StrokingColorN, [ctx.obj(1)]),
      setLineWidth(0.5),
      setLineJoin(LineJoinStyle.Round),
    );
    for (const pa of paths) {
      tracePrims(pa.prims, pa.closed);
      ops(stroke());
    }
    ops(popGraphicsState());
    endLayer();
  }

  // INFO: cotas, régua, carimbo
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  beginLayer("INFO");
  drawDims(page, dl, font, X, Y, ops);
  drawRuler(page, font, X(0), Y(-8), ops);
  drawStamp(page, font, bold, meta, dl, paper.name, pw, ph);
  endLayer();

  // sem object streams: mais compatível com RIPs e softwares de pré-impressão antigos
  return doc.save({ useObjectStreams: false });
}

/** Arco -> curvas de Bézier cúbicas (≤ 90° cada), em mm na tela (y para baixo). */
function arcToBeziers(a: Extract<Prim, { t: "arc" }>): number[][] {
  const out: number[][] = [];
  const total = a.a1 - a.a0;
  const nSeg = Math.max(1, Math.ceil(Math.abs(total) / 90));
  const step = total / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const t0 = ((a.a0 + step * i) * Math.PI) / 180;
    const t1 = ((a.a0 + step * (i + 1)) * Math.PI) / 180;
    const h = (4 / 3) * Math.tan((t1 - t0) / 4);
    const p0 = [a.c.x + a.r * Math.cos(t0), a.c.y + a.r * Math.sin(t0)];
    const p3 = [a.c.x + a.r * Math.cos(t1), a.c.y + a.r * Math.sin(t1)];
    const p1 = [p0[0] - h * a.r * Math.sin(t0), p0[1] + h * a.r * Math.cos(t0)];
    const p2 = [p3[0] + h * a.r * Math.sin(t1), p3[1] - h * a.r * Math.cos(t1)];
    out.push([p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]]);
  }
  return out;
}

type Fn = (v: number) => number;
type Ops = (...o: PDFOperator[]) => void;

function drawDims(page: PDFPage, dl: Dieline, font: PDFFont, X: Fn, Y: Fn, ops: Ops) {
  const size = 7;
  ops(pushGraphicsState(), setStrokingGrayscaleColor(0), setLineWidth(0.3));
  for (const d of dl.dims) {
    const g = dimGeometry(d);
    for (const [a, b, c, e] of [...g.ext, g.line]) ops(moveTo(X(a), Y(b)), lineTo(X(c), Y(e)), stroke());
  }
  ops(popGraphicsState());
  for (const d of dl.dims) {
    const g = dimGeometry(d);
    const w = font.widthOfTextAtSize(d.label, size);
    if (g.text.rot) page.drawText(d.label, { x: X(g.text.x) + size * 0.2, y: Y(g.text.y) - w / 2, size, font, rotate: degrees(90), color: rgb(0, 0, 0) });
    else page.drawText(d.label, { x: X(g.text.x) - w / 2, y: Y(g.text.y), size, font, color: rgb(0, 0, 0) });
  }
}

function drawRuler(page: PDFPage, font: PDFFont, x0: number, y0: number, ops: Ops) {
  ops(pushGraphicsState(), setStrokingGrayscaleColor(0), setLineWidth(0.4), moveTo(x0, y0), lineTo(x0 + 50 * PT, y0), stroke());
  for (let i = 0; i <= 50; i++) {
    const h = i % 10 === 0 ? 3 : i % 5 === 0 ? 2 : 1;
    ops(moveTo(x0 + i * PT, y0), lineTo(x0 + i * PT, y0 + h * PT), stroke());
  }
  ops(popGraphicsState());
  page.drawText("50 mm — confira com uma régua: a impressão deve estar em 100 %", { x: x0 + 52 * PT, y: y0, size: 7, font });
}

function drawStamp(page: PDFPage, font: PDFFont, bold: PDFFont, meta: PdfMeta, dl: Dieline, paper: string, pw: number, ph: number) {
  void ph;
  const s = meta.spec;
  const f1 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const x = PDF_MARGIN * PT;
  const top = (PDF_MARGIN + 24) * PT; // altura do carimbo a partir do rodapé
  const w = Math.min(pw - 2 * PDF_MARGIN, 260) * PT;
  page.drawRectangle({ x, y: PDF_MARGIN * PT, width: w, height: 24 * PT, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
  const line = (txt: string, row: number, b = false, size = 7.5) =>
    page.drawText(txt, { x: x + 3 * PT, y: top - (4 + row * 4) * PT, size, font: b ? bold : font, maxWidth: w - 6 * PT });
  line(
    `${meta.modeloNome} — ${f1(s.largura)} × ${f1(s.altura)} × ${f1(s.profundidade)} mm (medidas internas)` +
      (meta.validado ? "" : "  ·  MODELO EM VALIDAÇÃO: confira o protótipo"),
    0,
    true,
    8.5,
  );
  line(
    `Espessura ${s.espessura.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} mm · faca aberta ${f1(dl.bbox.w)} × ${f1(dl.bbox.h)} mm · folha ${paper}` +
      (meta.os ? ` · O.S. ${meta.os}` : "") +
      (meta.cliente ? ` · ${meta.cliente}` : ""),
    1,
  );
  line("Cores especiais: CORTE (vermelho) · VINCO (verde) · SERRILHA (magenta). Sangria e cola em camadas separadas.", 2);
  line("Gerado automaticamente. Imprima em 100 %, recorte, vinque e monte um protótipo com o material final antes de produzir.", 3, true);
  line(`${meta.data.toLocaleDateString("pt-BR")} · motor ${meta.motorVersao} · ${PDF_COTAS ? "cotas de vinco a vinco em mm" : ""}`, 4);
}

import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { end, start } from "../geom";
import { build } from "../models";
import { signedArea } from "../offset";
import { smallestPaper } from "../paper";
import { toDXF } from "../render/dxf";
import { toPDF } from "../render/pdf";
import { toSVG } from "../render/svg";
import { buildZip } from "../render/zip";
import type { Spec } from "../types";

const spec = (o: Partial<Spec> = {}): Spec => ({
  model: "fundo-cartucho",
  largura: 70,
  altura: 150,
  profundidade: 40,
  espessura: 0.345,
  sangria: true,
  areasCola: true,
  ...o,
});

const ok = (s: Spec) => {
  const r = build(s);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.dieline;
};

describe("fundo cartucho — geometria", () => {
  it("painéis de vinco a vinco seguem as folgas por espessura", () => {
    const d = ok(spec());
    const t = 0.345;
    expect(d.info.painelFrente).toBeCloseTo(70 + t, 6);
    expect(d.info.painelLateral).toBeCloseTo(40 + t, 6);
    expect(d.info.painelLateralFinal).toBeCloseTo(40 + t / 2, 6);
    expect(d.info.alturaCorpo).toBeCloseTo(150 + 2 * t, 6);
  });

  it("largura aberta = aba de cola + 4 painéis", () => {
    const d = ok(spec());
    const soma = d.info.abaCola + d.info.painelFrente + d.info.painelLateral + d.info.painelTras + d.info.painelLateralFinal;
    expect(d.bbox.w).toBeCloseTo(soma, 2);
  });

  it("altura aberta = corpo + 2 × (tampa + lingueta)", () => {
    const d = ok(spec());
    expect(d.bbox.h).toBeCloseTo(d.info.alturaCorpo + 2 * (d.info.profundidadeTampa + d.info.lingueta), 2);
  });

  it("contorno de corte é contínuo e fechado", () => {
    const d = ok(spec());
    const corte = d.paths.find((p) => p.kind === "corte")!;
    for (let i = 1; i < corte.prims.length; i++) {
      const a = end(corte.prims[i - 1]);
      const b = start(corte.prims[i]);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-6);
    }
    const first = start(corte.prims[0]);
    const last = end(corte.prims.at(-1)!);
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeLessThan(1e-6);
  });

  it("contorno começa no canto (0,0) depois de normalizar e não tem área negativa", () => {
    const d = ok(spec());
    expect(d.bbox.minX).toBeCloseTo(0, 6);
    expect(d.bbox.minY).toBeCloseTo(0, 6);
    expect(Math.abs(signedArea([...d.outline, d.outline[0]]))).toBeGreaterThan(70 * 150 * 2);
  });

  it("vincos ficam dentro do contorno", () => {
    const d = ok(spec());
    for (const pa of d.paths.filter((p) => p.kind === "vinco"))
      for (const pr of pa.prims) {
        const q = start(pr);
        expect(q.x).toBeGreaterThanOrEqual(-1e-6);
        expect(q.x).toBeLessThanOrEqual(d.bbox.w + 1e-6);
        expect(q.y).toBeGreaterThanOrEqual(-1e-6);
        expect(q.y).toBeLessThanOrEqual(d.bbox.h + 1e-6);
      }
  });

  it("aba de pó não passa do meio da caixa (não colide com a do lado oposto)", () => {
    for (const L of [20, 40, 70, 150]) {
      const d = ok(spec({ largura: L }));
      expect(d.info.abaPo).toBeLessThanOrEqual(L / 2);
    }
  });

  it("sangria envolve o contorno com 3 mm", () => {
    const d = ok(spec());
    const bb = d.bleed[0].reduce(
      (a, q) => ({ minX: Math.min(a.minX, q.x), maxX: Math.max(a.maxX, q.x), minY: Math.min(a.minY, q.y), maxY: Math.max(a.maxY, q.y) }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );
    expect(bb.minX).toBeCloseTo(-3, 1);
    expect(bb.maxX).toBeCloseTo(d.bbox.w + 3, 1);
    expect(bb.maxY).toBeCloseTo(d.bbox.h + 3, 1);
  });

  it("sem sangria e sem cola, não gera essas camadas", () => {
    const d = ok(spec({ sangria: false, areasCola: false }));
    expect(d.bleed).toHaveLength(0);
    expect(d.glue).toHaveLength(0);
  });

  it("mais espessura = faca maior", () => {
    const fina = ok(spec({ espessura: 0.3 }));
    const grossa = ok(spec({ espessura: 0.6 }));
    expect(grossa.bbox.w).toBeGreaterThan(fina.bbox.w);
  });
});

describe("fundo cartucho — regras", () => {
  it("recusa profundidade acima de 50 mm com mensagem do modelo", () => {
    const r = build(spec({ profundidade: 62 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.profundidade).toMatch(/50 mm/);
  });
  it("recusa medida faltando", () => {
    const r = build({ ...spec(), largura: undefined as unknown as number });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.largura).toBeTruthy();
  });
  it("recusa modelo desconhecido", () => {
    expect(build({ ...spec(), model: "nao-existe" }).ok).toBe(false);
  });
});

describe("papel", () => {
  it("escolhe a menor folha ISO que comporta faca + margens", () => {
    expect(smallestPaper(100, 150).name).toBe("A4");
    expect(smallestPaper(240, 260).name).toBe("A3");
    expect(smallestPaper(1200, 900).name).toBe("Plotter");
  });
});

describe("exportação", () => {
  it("SVG em mm com camadas", () => {
    const svg = toSVG(ok(spec()), { cotas: true });
    expect(svg).toMatch(/width="[\d.]+mm"/);
    for (const l of ["CORTE", "VINCO", "COTAS", "SANGRIA", "COLA"]) expect(svg).toContain(`id="${l}"`);
  });

  it("DXF R12 com camadas e só entidades LINE/ARC", () => {
    const dxf = toDXF(ok(spec()));
    expect(dxf).toContain("AC1009");
    expect(dxf).toContain("CORTE");
    expect(dxf).toContain("VINCO");
    const ents = [...dxf.matchAll(/\r\n0\r\n(LINE|ARC|LWPOLYLINE|SPLINE|TEXT)\r\n/g)].map((m) => m[1]);
    expect(new Set(ents)).toEqual(new Set(["LINE", "ARC"]));
  });

  it("DXF: arcos da lingueta ficam dentro do contorno (ângulos corretos após inverter Y)", () => {
    const d = ok(spec());
    const dxf = toDXF(d).split("\r\n");
    for (let i = 0; i < dxf.length; i++) {
      if (dxf[i] !== "ARC" || dxf[i - 1] !== "0") continue;
      const val = (code: string) => Number(dxf[dxf.indexOf(code, i) + 1]);
      const cx = val("10"), cy = val("20"), r = val("40"), s = val("50"), e = val("51");
      let sweep = e - s;
      if (sweep < 0) sweep += 360;
      expect(sweep).toBeCloseTo(90, 3); // cantos da lingueta são de 90°
      const mid = ((s + sweep / 2) * Math.PI) / 180;
      const mx = cx + r * Math.cos(mid);
      const my = d.bbox.h - (cy + r * Math.sin(mid));
      // o meio do arco tem que estar na borda externa da faca (topo ou base)
      expect(Math.min(my, d.bbox.h - my)).toBeLessThan(r);
      expect(mx).toBeGreaterThan(0);
    }
  });

  it("PDF com cores especiais, camadas e tamanho de folha", async () => {
    const d = ok(spec());
    const bytes = await toPDF(d, { titulo: "t", modeloNome: "Caixa fundo cartucho", spec: spec(), motorVersao: "test", data: new Date(2026, 10, 6) });
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("/Separation /CORTE /DeviceCMYK");
    expect(raw).toContain("/Separation /VINCO");
    expect(raw).toContain("/OCProperties");
    expect(raw).toMatch(/\/Type \/OCG/);
  });

  it("zip tem PDF, SVG, DXF e LEIA-ME", async () => {
    const s = spec();
    const { zip, filename } = await buildZip(s, ok(s));
    expect(filename).toBe("faca-fundo-cartucho-70x150x40.zip");
    const files = Object.keys(unzipSync(zip)).sort();
    expect(files).toEqual(["LEIA-ME.txt", "faca-fundo-cartucho-70x150x40.dxf", "faca-fundo-cartucho-70x150x40.pdf", "faca-fundo-cartucho-70x150x40.svg"]);
    expect(strFromU8(unzipSync(zip)["LEIA-ME.txt"])).toContain("protótipo");
  });
});

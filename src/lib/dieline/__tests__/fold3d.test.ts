import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { foldFundoCartucho } from "../fold3d";
import { montar } from "../fold3d-three";
import { build } from "../models";
import type { Spec } from "../types";

const spec: Spec = { model: "fundo-cartucho", largura: 70, altura: 150, profundidade: 40, espessura: 0.345, sangria: false, areasCola: false };

const caixa = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
const ponto = (o: THREE.Object3D, nome: string, x: number, y: number) => {
  const alvo = o.getObjectByName(nome)!;
  return alvo.localToWorld(new THREE.Vector3(x, y, 0));
};

describe("caixa 3D do fundo cartucho", () => {
  it("planificada (0%) ocupa a mesma área da faca 2D", () => {
    const m = montar(foldFundoCartucho(spec));
    m.aplicar(0);
    const b = caixa(m.raiz);
    const r = build(spec);
    if (!r.ok) throw new Error();
    expect(b.max.x - b.min.x).toBeCloseTo(r.dieline.bbox.w, 1);
    expect(b.max.y - b.min.y).toBeCloseTo(r.dieline.bbox.h, 1);
    expect(b.max.z - b.min.z).toBeCloseTo(0, 6);
  });

  it("montada (100%) tem as medidas da caixa: largura × altura × profundidade (vinco a vinco)", () => {
    const m = montar(foldFundoCartucho(spec));
    m.aplicar(1);
    const b = caixa(m.raiz);
    const t = spec.espessura;
    expect(b.max.x - b.min.x).toBeCloseTo(70 + t, 1);
    expect(b.max.y - b.min.y).toBeCloseTo(150 + 2 * t, 1);
    expect(b.max.z - b.min.z).toBeCloseTo(40 + t, 1);
  });

  it("montada: a borda livre da lateral 2 encontra a dobra da aba de cola (tubo fecha)", () => {
    const m = montar(foldFundoCartucho(spec));
    m.aplicar(1);
    const s2 = m.raiz.getObjectByName("lateral 2")!;
    const wS2 = 40 + spec.espessura / 2;
    const borda = s2.localToWorld(new THREE.Vector3(wS2, 0, 0));
    // a lateral final é meia espessura menor: fica a ≤ 0,2 mm do canto da frente
    expect(borda.distanceTo(new THREE.Vector3(0, 0, 0))).toBeLessThan(0.2);
  });

  it("montada: tampas cobrem a boca e linguetas entram na caixa", () => {
    const m = montar(foldFundoCartucho(spec));
    m.aplicar(1);
    const H = 150 + 2 * spec.espessura;
    const topo = ponto(m.raiz, "tampa de cima", 10, 10);
    expect(topo.y).toBeCloseTo(H, 3);
    const lingueta = ponto(m.raiz, "lingueta de cima", 10, 10);
    expect(lingueta.y).toBeLessThan(H); // aponta para dentro
    const base = ponto(m.raiz, "tampa de baixo", 10, -10);
    expect(base.y).toBeCloseTo(0, 3);
  });

  it("abas de pó dobram antes das tampas", () => {
    const m = montar(foldFundoCartucho(spec));
    m.aplicar(0.5); // corpo e abas de pó prontos, tampas ainda abertas
    const aba = m.raiz.getObjectByName("aba de pó sup. 1")!;
    const tampa = m.raiz.getObjectByName("tampa de cima")!;
    expect(Math.abs(aba.rotation.x)).toBeCloseTo(Math.PI / 2, 3);
    expect(tampa.rotation.x).toBeCloseTo(0, 6);
  });
});

/** Monta a árvore de dobra como objetos three.js. Sem WebGL aqui: só geometria (testável em Node). */
import * as THREE from "three";
import { fracaoEtapa, type FoldNode } from "./fold3d";

export type Montada = { raiz: THREE.Group; aplicar: (progresso: number) => void; dispose: () => void };

export function montar(no: FoldNode, mat?: { papel: THREE.Material; borda: THREE.LineBasicMaterial }): Montada {
  const juntas: { g: THREE.Group; no: FoldNode }[] = [];
  const geos: THREE.BufferGeometry[] = [];

  function build(n: FoldNode): THREE.Group {
    const g = new THREE.Group();
    g.name = n.nome;
    g.position.set(n.origem[0], n.origem[1], 0);
    const shape = new THREE.Shape(n.poly.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ShapeGeometry(shape);
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat?.papel);
    mesh.name = `${n.nome}:painel`;
    g.add(mesh);
    if (mat) {
      const pts = [...n.poly, n.poly[0]].map(([x, y]) => new THREE.Vector3(x, y, 0.01));
      const lg = new THREE.BufferGeometry().setFromPoints(pts);
      geos.push(lg);
      g.add(new THREE.Line(lg, mat.borda));
    }
    for (const f of n.filhos) g.add(build(f));
    if (n.eixo) juntas.push({ g, no: n });
    return g;
  }

  const raiz = build(no);
  // raiz sem eixo pode ter uma inclinação fixa (ex.: bandeja com parede de trás inclinada)
  if (!no.eixo && no.angulo) raiz.rotation.x = THREE.MathUtils.degToRad(no.angulo);
  const aplicar = (progresso: number) => {
    for (const { g, no: n } of juntas) {
      const a = THREE.MathUtils.degToRad(n.angulo * fracaoEtapa(progresso, n.etapa));
      if (Array.isArray(n.eixo)) g.quaternion.setFromAxisAngle(new THREE.Vector3(n.eixo[0], n.eixo[1], 0).normalize(), a);
      else g.rotation.set(n.eixo === "x" ? a : 0, n.eixo === "y" ? a : 0, 0);
    }
    raiz.updateMatrixWorld(true);
  };
  aplicar(0);
  return { raiz, aplicar, dispose: () => geos.forEach((x) => x.dispose()) };
}

/**
 * Peça 3D montada a partir das FACES REAIS da faca (polígonos entre cortes e vincos, em mm,
 * coordenadas da faca: x para a direita, y para baixo). Cada face gira na sua dobra (segmento
 * do vinco) em relação à face-mãe. Ângulo positivo = dobra para o lado de dentro da embalagem.
 */
export type FaceDobra = { poly: [number, number][]; pai: number | null; dobra: [[number, number], [number, number]] | null; angulo: number; etapa: number };

export function montarFaces(faces: FaceDobra[], mat?: { papel: THREE.Material; borda: THREE.LineBasicMaterial }): Montada {
  const geos: THREE.BufferGeometry[] = [];
  const juntas: { g: THREE.Group; eixo: THREE.Vector3; f: FaceDobra }[] = [];
  const grupos: THREE.Group[] = [];
  const raiz = new THREE.Group();
  faces.forEach((f, i) => {
    // articulação na dobra (ou na origem, para a raiz) + conteúdo deslocado para o referencial da faca
    const junta = new THREE.Group();
    const conteudo = new THREE.Group();
    junta.add(conteudo);
    const p = f.dobra?.[0] ?? [0, 0];
    junta.position.set(p[0], 0, p[1]);
    conteudo.position.set(-p[0], 0, -p[1]);
    const shape = new THREE.Shape(f.poly.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2);
    geos.push(geo);
    conteudo.add(new THREE.Mesh(geo, mat?.papel));
    if (mat) {
      const lg = new THREE.BufferGeometry().setFromPoints([...f.poly, f.poly[0]].map(([x, y]) => new THREE.Vector3(x, 0.05, y)));
      geos.push(lg);
      conteudo.add(new THREE.Line(lg, mat.borda));
    }
    grupos[i] = conteudo;
    (f.pai == null ? raiz : grupos[f.pai]).add(junta);
    if (f.dobra && f.pai != null) {
      const [[px, py], [qx, qy]] = f.dobra;
      const eixo = new THREE.Vector3(qx - px, 0, qy - py).normalize();
      // sentido do eixo: girar positivo levanta a face (+Y), que vira o lado de dentro
      const cx = f.poly.reduce((s, q) => s + q[0], 0) / f.poly.length - px;
      const cy = f.poly.reduce((s, q) => s + q[1], 0) / f.poly.length - py;
      if (eixo.z * cx - eixo.x * cy < 0) eixo.negate();
      juntas.push({ g: junta, eixo, f });
    }
  });
  const aplicar = (progresso: number) => {
    for (const { g, eixo, f } of juntas) g.quaternion.setFromAxisAngle(eixo, THREE.MathUtils.degToRad(f.angulo * fracaoEtapa(progresso, f.etapa)));
    raiz.updateMatrixWorld(true);
  };
  aplicar(0);
  return { raiz, aplicar, dispose: () => geos.forEach((x) => x.dispose()) };
}

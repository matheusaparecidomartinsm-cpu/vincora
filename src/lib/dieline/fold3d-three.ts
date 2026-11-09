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
      g.rotation.set(n.eixo === "x" ? a : 0, n.eixo === "y" ? a : 0, 0);
    }
    raiz.updateMatrixWorld(true);
  };
  aplicar(0);
  return { raiz, aplicar, dispose: () => geos.forEach((x) => x.dispose()) };
}

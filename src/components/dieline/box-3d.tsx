"use client";
import { Play, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { FOLD_MODELS } from "@/lib/dieline/fold3d";
import type { Spec } from "@/lib/dieline/types";

type Engine = {
  setFold: (p: number) => void;
  setView: (yaw: number, pitch: number, zoom: number) => void;
  dispose: () => void;
};

const VISTA0 = { yaw: -0.6, pitch: 0.35, zoom: 1 };
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#cccccc";

/** Caixa montada em 3D, gerada da mesma geometria da faca. three.js só carrega quando este componente aparece. */
export function Box3D({ spec, label }: { spec: Spec | null; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [fold, setFold] = useState(100);
  const [vista, setVista] = useState(VISTA0);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "sem-webgl" | "sem-modelo">("carregando");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const sliderId = useId();
  const anim = useRef<number | null>(null);
  const specKey = spec ? JSON.stringify(spec) : "";

  // (re)cria a cena quando a faca muda
  useEffect(() => {
    if (!spec || !host.current) return;
    const fn = FOLD_MODELS[spec.model];
    if (!fn) {
      setEstado("sem-modelo");
      return;
    }
    let cancelado = false;
    (async () => {
      const THREE = await import("three");
      const { montar } = await import("@/lib/dieline/fold3d-three");
      if (cancelado || !host.current) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      } catch {
        setEstado("sem-webgl");
        return;
      }
      const el = host.current;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 2.2));
      const sol = new THREE.DirectionalLight(0xffffff, 1.6);
      sol.position.set(1, 2, 3);
      scene.add(sol);

      const papel = new THREE.MeshLambertMaterial({ color: new THREE.Color(cssVar("--c-surface")), side: THREE.DoubleSide });
      const borda = new THREE.LineBasicMaterial({ color: new THREE.Color(cssVar("--c-line-dim")) });
      const m = montar(fn(spec), { papel, borda });
      const pivo = new THREE.Group();
      pivo.add(m.raiz);
      scene.add(pivo);

      // enquadra pelo maior tamanho entre "meio dobrada" e "fechada" (tampas abertas ocupam mais)
      let raio = 0;
      for (const p of [0.5, 0.75, 1]) {
        m.aplicar(p);
        const tam = new THREE.Box3().setFromObject(m.raiz).getSize(new THREE.Vector3());
        raio = Math.max(raio, tam.length() / 2);
      }
      const camera = new THREE.PerspectiveCamera(35, 1, 1, raio * 20);

      let atual = { fold: 1, yaw: VISTA0.yaw, pitch: VISTA0.pitch, zoom: 1 };
      const desenhar = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = w / h;
        m.aplicar(atual.fold);
        // centraliza a peça no estado atual
        pivo.rotation.set(0, 0, 0);
        pivo.position.set(0, 0, 0);
        m.raiz.position.set(0, 0, 0); // zera o deslocamento do quadro anterior antes de medir
        pivo.updateMatrixWorld(true);
        const c = new THREE.Box3().setFromObject(m.raiz).getCenter(new THREE.Vector3());
        m.raiz.position.set(-c.x, -c.y, -c.z);
        pivo.rotation.set(atual.pitch, atual.yaw, 0);
        const d = (raio * 1.05) / atual.zoom / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect);
        camera.position.set(0, 0, d);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      const ro = new ResizeObserver(desenhar);
      ro.observe(el);
      engine.current = {
        setFold: (p) => {
          atual = { ...atual, fold: p };
          desenhar();
        },
        setView: (yaw, pitch, zoom) => {
          atual = { ...atual, yaw, pitch, zoom };
          desenhar();
        },
        dispose: () => {
          ro.disconnect();
          m.dispose();
          papel.dispose();
          borda.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        },
      };
      setEstado("pronto");
      desenhar();
    })();
    return () => {
      cancelado = true;
      engine.current?.dispose();
      engine.current = null;
    };
    // a cena depende só da spec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey]);

  useEffect(() => engine.current?.setFold(fold / 100), [fold, estado]);
  useEffect(() => engine.current?.setView(vista.yaw, vista.pitch, vista.zoom), [vista, estado]);
  useEffect(() => () => {
    if (anim.current) cancelAnimationFrame(anim.current);
  }, []);

  function montarAnimado() {
    if (anim.current) cancelAnimationFrame(anim.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setFold(100);
    const t0 = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / 1800);
      setFold(Math.round(p * 100));
      if (p < 1) anim.current = requestAnimationFrame(passo);
    };
    anim.current = requestAnimationFrame(passo);
  }

  const girar = (dx: number, dy: number) =>
    setVista((v) => ({ ...v, yaw: v.yaw + dx, pitch: Math.max(-1.4, Math.min(1.4, v.pitch + dy)) }));

  function onKey(e: KeyboardEvent) {
    const k = ({ ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] } as Record<string, [number, number]>)[e.key];
    if (k) {
      e.preventDefault();
      girar(k[0], k[1]);
    } else if (e.key === "+" || e.key === "=") setVista((v) => ({ ...v, zoom: Math.min(4, v.zoom * 1.2) }));
    else if (e.key === "-") setVista((v) => ({ ...v, zoom: Math.max(0.4, v.zoom / 1.2) }));
  }

  if (!spec)
    return (
      <div className="grid h-full min-h-64 place-items-center rounded-lg border border-dashed border-border-strong bg-canvas p-6 text-center text-sm text-text-subtle">
        Digite as medidas para ver a caixa montada.
      </div>
    );

  return (
    <div className="flex h-full min-h-80 flex-col overflow-hidden rounded-lg border border-border bg-canvas">
      <div
        ref={host}
        role="img"
        tabIndex={0}
        aria-label={`${label} montada em 3D. Use as setas para girar e + ou − para aproximar.`}
        className="relative min-h-0 flex-1 cursor-grab touch-none active:cursor-grabbing"
        onKeyDown={onKey}
        onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          girar((e.clientX - drag.current.x) * 0.01, (e.clientY - drag.current.y) * 0.01);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (drag.current = null)}
        onWheel={(e: WheelEvent) => setVista((v) => ({ ...v, zoom: Math.max(0.4, Math.min(4, v.zoom * (e.deltaY < 0 ? 1.1 : 0.9))) }))}
      >
        {estado === "carregando" && (
          <div className="absolute inset-0 grid place-items-center text-sm text-text-subtle [animation:pulse-soft_1.4s_ease-in-out_infinite]">Montando a caixa…</div>
        )}
        {estado === "sem-webgl" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-text-muted">
            Este navegador não mostra 3D (WebGL desligado). A faca 2D e os arquivos continuam funcionando.
          </div>
        )}
        {estado === "sem-modelo" && <div className="absolute inset-0 grid place-items-center text-sm text-text-muted">Visualização 3D ainda não disponível para este modelo.</div>}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface px-3 py-2">
        <label htmlFor={sliderId} className="text-xs font-medium text-text-muted">
          Dobrar
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          value={fold}
          onChange={(e) => setFold(Number(e.target.value))}
          aria-valuetext={`${fold} por cento montada`}
          className="min-w-24 flex-1 accent-[var(--c-accent)]"
        />
        <span className="num w-10 text-right text-xs text-text-muted">{fold}%</span>
        <button type="button" onClick={montarAnimado} className="flex h-control-sm items-center gap-1 rounded-md px-2 text-xs font-semibold text-accent hover:bg-accent-soft">
          <Play size={14} aria-hidden /> Montar
        </button>
        <button type="button" onClick={() => setVista(VISTA0)} className="flex h-control-sm items-center gap-1 rounded-md px-2 text-xs font-semibold text-accent hover:bg-accent-soft">
          <RotateCcw size={14} aria-hidden /> Reiniciar vista
        </button>
      </div>
    </div>
  );
}

"use client";
import { clsx } from "clsx";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { dimGeometry, polyToD, primsToD } from "@/lib/dieline/render/svg";
import type { Dieline, LineKind } from "@/lib/dieline/types";

const stroke: Record<LineKind, { color: string; dash?: string; w: number }> = {
  corte: { color: "var(--c-line-cut)", w: 1.25 },
  vinco: { color: "var(--c-line-crease)", dash: "6 3", w: 1.25 },
  serrilha: { color: "var(--c-line-perf)", dash: "2 2", w: 1.25 },
};

export function DielineViewer({
  dieline,
  label,
  invalid,
  thumbnail,
  emptyText = "Informe as medidas para ver a faca.",
}: {
  dieline: Dieline | null;
  label: string;
  invalid?: boolean;
  thumbnail?: boolean;
  emptyText?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  if (!dieline) {
    return (
      <div className="grid h-full min-h-64 place-items-center rounded-lg border border-dashed border-border-strong bg-canvas p-6 text-center text-sm text-text-subtle">
        {emptyText}
      </div>
    );
  }

  const { bbox, paths, dims, glue, bleed } = dieline;
  const fs = Math.max(bbox.w, bbox.h) / 46 / zoom;
  // cotas do motor usam offsets pensados para texto de 2,5 mm (PDF); na tela o texto é maior
  const dimK = Math.max(1, fs / 4);
  const pad = thumbnail ? 4 : Math.max(bbox.w, bbox.h) * 0.14;
  const vw = (bbox.w + pad * 2) / zoom;
  const vh = (bbox.h + pad * 2) / zoom;
  const cx = bbox.w / 2 - pan.x;
  const cy = bbox.h / 2 - pan.y;
  const vb = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;
  const ariaLabel = `${label}. Faca aberta ${fmt(bbox.w)} por ${fmt(bbox.h)} milímetros.${invalid ? " Medidas atuais fora da regra; mostrando a última faca válida." : ""}`;

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (thumbnail) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = Math.max(vw / rect.width, vh / rect.height);
    const d0 = drag.current;
    setPan((pp) => ({ x: pp.x + (e.clientX - d0.x) * k, y: pp.y + (e.clientY - d0.y) * k }));
    drag.current = { x: e.clientX, y: e.clientY };
  }
  const fit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const svg = (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={vb}
      preserveAspectRatio="xMidYMid meet"
      className={clsx("h-full w-full select-none", !thumbnail && "cursor-grab active:cursor-grabbing", invalid && "opacity-35")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={fit}
    >
      {!thumbnail && (
        <>
          <defs>
            <pattern id="grade10" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--c-canvas-grid)" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect x={-5000} y={-5000} width={12000} height={12000} fill="url(#grade10)" />
        </>
      )}
      {glue.map((g, i) => (
        <path key={`g${i}`} d={polyToD(g)} fill="var(--c-glue-fill)" opacity={0.7} />
      ))}
      {!thumbnail &&
        bleed.map((b, i) => (
          <path key={`b${i}`} d={polyToD(b)} fill="none" stroke="var(--c-line-bleed)" strokeWidth={0.75} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        ))}
      {paths.map((pa, i) => {
        const st = stroke[pa.kind];
        return (
          <path
            key={i}
            d={primsToD(pa.prims, pa.closed)}
            fill="none"
            stroke={st.color}
            strokeWidth={thumbnail ? st.w * 1.2 : st.w}
            strokeDasharray={thumbnail ? undefined : st.dash}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        );
      })}
      {!thumbnail &&
        dims.map((d, i) => {
          const g = dimGeometry({ ...d, offset: d.offset * dimK });
          const [x1, y1, x2, y2] = g.line;
          return (
            <g key={`d${i}`} stroke="var(--c-line-dim)">
              {g.ext.map(([a, b, c, e], j) => (
                <line key={j} x1={a} y1={b} x2={c} y2={e} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
              <text
                x={g.text.x}
                y={g.text.y - (g.text.rot ? 0 : fs * 0.15)}
                transform={g.text.rot ? `rotate(90 ${g.text.x} ${g.text.y})` : undefined}
                textAnchor="middle"
                dy={g.text.rot ? -fs * 0.35 : 0}
                fontSize={fs}
                fill="var(--c-line-dim)"
                stroke="none"
                className="num"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      {!thumbnail && <Ruler x={0} y={-Math.max(8, fs * 1.4)} fs={fs} />}
    </svg>
  );

  if (thumbnail) return <div className="aspect-[4/3] w-full">{svg}</div>;

  return (
    <div className="flex h-full min-h-80 flex-col overflow-hidden rounded-lg border border-border bg-canvas">
      <div className="relative min-h-0 flex-1 touch-none">
        {svg}
        <div className="absolute bottom-3 right-3 flex gap-1 rounded-md border border-border bg-surface p-1 shadow-md">
          <ZoomBtn label="Diminuir zoom" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))}>
            <Minus size={16} aria-hidden />
          </ZoomBtn>
          <ZoomBtn label="Ajustar à tela" onClick={fit}>
            <Maximize2 size={16} aria-hidden />
          </ZoomBtn>
          <ZoomBtn label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(10, z * 1.25))}>
            <Plus size={16} aria-hidden />
          </ZoomBtn>
        </div>
      </div>
      <Legend hasBleed={bleed.length > 0} hasGlue={glue.length > 0} />
    </div>
  );
}

function ZoomBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-control-sm w-control-sm place-items-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text"
    >
      {children}
    </button>
  );
}

export function Legend({ hasBleed = true, hasGlue = true }: { hasBleed?: boolean; hasGlue?: boolean }) {
  const items = [
    { k: "Corte", c: "var(--c-line-cut)", dash: undefined, show: true },
    { k: "Vinco", c: "var(--c-line-crease)", dash: "6 3", show: true },
    { k: "Serrilha", c: "var(--c-line-perf)", dash: "2 2", show: true },
    { k: "Sangria", c: "var(--c-line-bleed)", dash: "4 4", show: hasBleed },
  ];
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border bg-surface px-3 py-2">
      {items
        .filter((i) => i.show)
        .map((it) => (
          <li key={it.k} className="flex items-center gap-2 text-xs text-text-muted">
            <svg width="24" height="6" aria-hidden>
              <line x1="0" y1="3" x2="24" y2="3" stroke={it.c} strokeWidth="2" strokeDasharray={it.dash} />
            </svg>
            {it.k}
          </li>
        ))}
      {hasGlue && (
        <li className="flex items-center gap-2 text-xs text-text-muted">
          <span aria-hidden className="h-2.5 w-4 rounded-[2px] bg-glue-fill" />
          Área de cola
        </li>
      )}
      <li className="ml-auto hidden text-xs text-text-subtle sm:block">Arraste para mover · duplo clique ajusta</li>
    </ul>
  );
}

/** Régua de 50 mm para conferir escala. */
function Ruler({ x, y, fs }: { x: number; y: number; fs: number }) {
  return (
    <g stroke="var(--c-line-dim)">
      <line x1={x} y1={y} x2={x + 50} y2={y} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={x + i * 5} y1={y} x2={x + i * 5} y2={y - (i % 2 === 0 ? 3 : 1.5)} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      ))}
      <text x={x + 52} y={y} fontSize={fs * 0.85} fill="var(--c-line-dim)" stroke="none" dominantBaseline="middle" className="num">
        50 mm
      </text>
    </g>
  );
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

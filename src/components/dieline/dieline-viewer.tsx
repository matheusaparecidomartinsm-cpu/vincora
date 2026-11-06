"use client";
import { clsx } from "clsx";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import type { SampleDieline } from "./sample";

const stroke = {
  corte: { color: "var(--c-line-cut)", dash: undefined, w: 1.25 },
  vinco: { color: "var(--c-line-crease)", dash: "6 3", w: 1.25 },
  serrilha: { color: "var(--c-line-perf)", dash: "2 2", w: 1.25 },
  sangria: { color: "var(--c-line-bleed)", dash: "4 4", w: 0.75 },
} as const;

export function DielineViewer({
  dieline,
  label,
  invalid,
  thumbnail,
}: {
  dieline: SampleDieline | null;
  label: string;
  invalid?: boolean;
  thumbnail?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  if (!dieline) {
    return (
      <div className="grid h-full min-h-64 place-items-center rounded-lg border border-dashed border-border-strong bg-canvas p-6 text-center text-sm text-text-subtle">
        Informe as medidas para ver a faca.
      </div>
    );
  }

  const { bbox, segs, dims, glue } = dieline;
  const fs = Math.max(bbox.w, bbox.h) / 28 / zoom; // ~13 px na tela
  const pad = thumbnail ? 6 : 60;
  const vw = (bbox.w + pad * 2) / zoom;
  const vh = (bbox.h + pad * 2) / zoom;
  const cx = bbox.w / 2 - pan.x;
  const cy = bbox.h / 2 - pan.y;
  const vb = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;
  const ariaLabel = `${label}. Faca aberta ${fmt(bbox.w)} por ${fmt(bbox.h)} milímetros.`;

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (thumbnail) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = vw / rect.width;
    setPan((p) => ({ x: p.x + (e.clientX - drag.current!.x) * k, y: p.y + (e.clientY - drag.current!.y) * k }));
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
      className={clsx("h-full w-full", !thumbnail && "cursor-grab active:cursor-grabbing", invalid && "opacity-35")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onDoubleClick={fit}
    >
      {!thumbnail && (
        <>
          <defs>
            <pattern id="grid10" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--c-canvas-grid)" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect x={-2000} y={-2000} width={6000} height={6000} fill="url(#grid10)" />
        </>
      )}
      {glue.map((g, i) => (
        <rect key={i} x={g.x} y={g.y} width={g.w} height={g.h} fill="var(--c-glue-fill)" opacity={0.6} />
      ))}
      {segs.map((s, i) => {
        const st = stroke[s.kind];
        return (
          <path
            key={i}
            d={s.d}
            fill="none"
            stroke={st.color}
            strokeWidth={thumbnail ? st.w * 1.6 : st.w}
            strokeDasharray={st.dash}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        );
      })}
      {!thumbnail && dims.map((d, i) => <DimLine key={i} {...d} fs={fs} />)}
      {!thumbnail && <Ruler x={0} y={-36} fs={fs} />}
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
        <ZoomBtn label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(8, z * 1.25))}>
          <Plus size={16} aria-hidden />
        </ZoomBtn>
        </div>
      </div>
      <Legend />
    </div>
  );
}

function ZoomBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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

export function Legend() {
  const items = [
    { k: "Corte", c: "var(--c-line-cut)", dash: undefined },
    { k: "Vinco", c: "var(--c-line-crease)", dash: "6 3" },
    { k: "Serrilha", c: "var(--c-line-perf)", dash: "2 2" },
    { k: "Sangria", c: "var(--c-line-bleed)", dash: "4 4" },
  ];
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border bg-surface px-3 py-2">
      {items.map((it) => (
        <li key={it.k} className="flex items-center gap-2 text-xs text-text-muted">
          <svg width="24" height="6" aria-hidden>
            <line x1="0" y1="3" x2="24" y2="3" stroke={it.c} strokeWidth="2" strokeDasharray={it.dash} />
          </svg>
          {it.k}
        </li>
      ))}
      <li className="flex items-center gap-2 text-xs text-text-muted">
        <span aria-hidden className="h-2.5 w-4 rounded-[2px] bg-glue-fill" />
        Área de cola
      </li>
    </ul>
  );
}

function DimLine({ x1, y1, x2, y2, label, offset, axis, fs }: { x1: number; y1: number; x2: number; y2: number; label: string; offset: number; axis: "x" | "y"; fs: number }) {
  const c = "var(--c-line-dim)";
  if (axis === "x") {
    const y = y1 + offset;
    return (
      <g>
        <line x1={x1} y1={y1 + 2} x2={x1} y2={y + 3} stroke={c} strokeWidth={0.4} />
        <line x1={x2} y1={y2 + 2} x2={x2} y2={y + 3} stroke={c} strokeWidth={0.4} />
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={c} strokeWidth={0.5} />
        <text x={(x1 + x2) / 2} y={y - fs * 0.35} textAnchor="middle" fontSize={fs} fill={c} className="num">
          {label}
        </text>
      </g>
    );
  }
  const x = x1 + offset;
  return (
    <g>
      <line x1={x1 + 2} y1={y1} x2={x + 3} y2={y1} stroke={c} strokeWidth={0.4} />
      <line x1={x2 + 2} y1={y2} x2={x + 3} y2={y2} stroke={c} strokeWidth={0.4} />
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={c} strokeWidth={0.5} />
      <text x={x + fs * 0.4} y={(y1 + y2) / 2} fontSize={fs} fill={c} dominantBaseline="middle" className="num">
        {label}
      </text>
    </g>
  );
}

/** Régua de 50 mm para conferir escala. */
function Ruler({ x, y, fs }: { x: number; y: number; fs: number }) {
  const c = "var(--c-line-dim)";
  return (
    <g>
      <line x1={x} y1={y} x2={x + 50} y2={y} stroke={c} strokeWidth={0.6} />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={x + i * 5} y1={y} x2={x + i * 5} y2={y - (i % 2 === 0 ? 4 : 2)} stroke={c} strokeWidth={0.4} />
      ))}
      <text x={x + 53} y={y} fontSize={fs * 0.85} fill={c} dominantBaseline="middle" className="num">
        50 mm
      </text>
    </g>
  );
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

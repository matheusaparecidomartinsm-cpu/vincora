import Link from "next/link";
import { mm, type FacaCasa } from "@/lib/facas-casa";
import { Badge } from "./feedback";

export function FacaCasaCard({ f }: { f: FacaCasa }) {
  return (
    <Link
      href={`/casa/${f.slug}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-[var(--m-fast)] hover:border-accent hover:shadow-md"
    >
      <div className="rounded-md bg-canvas p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/facas-casa/${f.slug}.svg`} alt={`Esquema da faca ${f.nome}`} className="aspect-[4/3] w-full object-contain" loading="lazy" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-md font-semibold text-text">{f.nome}</p>
          <p className="text-xs text-text-muted">
            {mm(f.largura)} × {mm(f.profundidade)} × {mm(f.altura)} mm
          </p>
          <p className="mt-1 flex flex-wrap gap-x-2 font-mono text-xs text-text-subtle">
            {[f.produto, f.faca, f.fb, f.bl].filter(Boolean).map((c) => (
              <span key={c} className="whitespace-nowrap">
                {c}
              </span>
            ))}
          </p>
        </div>
        <Badge tone="neutral">Faca da casa</Badge>
      </div>
    </Link>
  );
}

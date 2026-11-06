"use client";
import { clsx } from "clsx";
import { Box, FolderOpen, HelpCircle, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DielineViewer } from "../dieline/dieline-viewer";
import type { Dieline } from "@/lib/dieline/types";
import { Badge } from "./feedback";
import { MobileNav } from "./mobile-nav";

export function AppHeader() {
  const path = usePathname() ?? "/";
  const current = path === "/" || path.startsWith("/criar") ? "modelos" : path.startsWith("/facas") ? "facas" : path.startsWith("/config") ? "config" : path.startsWith("/ajuda") ? "ajuda" : null;
  const nav = [
    { k: "modelos", href: "/", label: "Modelos", Icon: Box },
    { k: "facas", href: "/facas", label: "Facas salvas", Icon: FolderOpen },
    { k: "config", href: "/config/materiais", label: "Configurações", Icon: Settings },
    { k: "ajuda", href: "/ajuda", label: "Ajuda", Icon: HelpCircle },
  ] as const;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-md focus:bg-surface focus:p-2">
        Ir para o conteúdo
      </a>
      <div className="mx-auto flex h-header-h max-w-content-max items-center gap-6 px-4">
        <Link href="/" className="text-md font-semibold text-text">Gerador de Facas</Link>
        <nav aria-label="Principal" className="hidden gap-1 md:flex">
          {nav.map(({ k, href, label, Icon }) => (
            <Link
              key={k}
              href={href}
              aria-current={current === k ? "page" : undefined}
              className={clsx(
                "flex h-control-sm items-center gap-2 rounded-md px-3 text-sm",
                current === k ? "bg-accent-soft font-medium text-on-accent-soft" : "text-text-muted hover:text-text",
              )}
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <MobileNav current={current} items={nav.map(({ k, href, label }) => ({ k, href, label }))} />
      </div>
    </header>
  );
}

export function ModelCard({
  slug,
  nome,
  categoria,
  preview,
  enabled = true,
  descricao,
}: {
  descricao?: string;
  slug: string;
  nome: string;
  categoria: string;
  preview?: Dieline | null;
  enabled?: boolean;
}) {
  const body = (
    <>
      <div className="rounded-md bg-canvas p-3">
        {preview ? (
          <DielineViewer dieline={preview} label={`Esquema de ${nome}`} thumbnail />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center text-text-disabled">
            <Package size={40} strokeWidth={1.25} aria-hidden />
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-md font-semibold text-text">{nome}</p>
          <p className="text-xs text-text-muted">{categoria}</p>
          {descricao && <p className="mt-2 text-sm text-text-muted">{descricao}</p>}
        </div>
        {!enabled && <Badge tone="neutral">Em breve</Badge>}
      </div>
    </>
  );
  const cls = "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-[var(--m-fast)]";
  if (!enabled)
    return (
      <div aria-disabled className="flex items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3">
        <Package size={20} strokeWidth={1.5} aria-hidden className="shrink-0 text-text-subtle" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">{nome}</p>
          <p className="text-xs text-text-muted">{categoria}</p>
        </div>
        <Badge tone="neutral">Em breve</Badge>
        <p className="sr-only">Modelo ainda em desenvolvimento.</p>
      </div>
    );
  return (
    <Link href={`/criar/${slug}`} className={clsx(cls, "hover:border-accent hover:shadow-md")}>
      {body}
    </Link>
  );
}

export function SpecSummary({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md bg-surface-sunken p-3 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-text-muted">{r.label}</dt>
          <dd className="num text-right text-text">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  empty,
  loading,
}: {
  caption: string;
  columns: { key: string; label: string; numeric?: boolean; render: (row: T) => ReactNode }[];
  rows: T[];
  empty: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={clsx("px-4 py-3 text-xs font-semibold text-text-muted", c.numeric ? "text-right" : "text-left")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={loading || undefined}>
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <span className="block h-3 w-3/4 rounded-sm bg-surface-sunken [animation:pulse-soft_1.4s_ease-in-out_infinite]" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted">
                    {empty}
                  </td>
                </tr>
              )
              : rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-sunken">
                    {columns.map((c) => (
                      <td key={c.key} className={clsx("px-4 py-3 text-text", c.numeric && "num text-right")}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  );
}

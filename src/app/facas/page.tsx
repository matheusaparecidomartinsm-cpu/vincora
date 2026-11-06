"use client";
import { Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { DataTable } from "@/components/ui/layout-parts";
import { formatMm } from "@/components/ui/measure-field";
import { Dialog } from "@/components/ui/overlay";
import { Page } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast-host";
import { data, type DielineRecord } from "@/lib/data";
import { CATALOGO } from "@/lib/dieline/models";

const nomeModelo = (slug: string) =>
  CATALOGO.find((m) => m.slug === slug)?.nome ?? slug;
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export default function FacasPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<DielineRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [toDelete, setToDelete] = useState<DielineRecord | null>(null);
  const toast = useToast();

  const load = useCallback((query: string) => {
    setError(false);
    data
      .listDielines({ q: query })
      .then(setRows)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), q ? 200 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  async function excluir() {
    if (!toDelete) return;
    const alvo = toDelete;
    setRows((rs) => rs?.filter((r) => r.id !== alvo.id) ?? rs); // some da lista na hora
    await data.deleteDieline(toDelete.id);
    toast({
      tone: "success",
      title: "Faca excluída",
      description: toDelete.nome,
    });
    setToDelete(null);
    load(q);
  }

  return (
    <Page
      title="Facas salvas"
      description="Facas da equipe, com O.S. e cliente. Abra uma para ajustar ou exportar de novo."
      actions={
        <Link
          href="/"
          className="inline-flex h-control-md items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover"
        >
          <Plus size={16} aria-hidden /> Nova faca
        </Link>
      }
    >
      <div className="relative max-w-md">
        <label htmlFor="busca" className="sr-only">
          Buscar por nome, O.S. ou cliente
        </label>
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle"
        />
        <input
          id="busca"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, O.S. ou cliente"
          className="h-control-md w-full rounded-md border border-border-input bg-surface pl-9 pr-3 text-md placeholder:text-text-subtle"
        />
      </div>

      {error ? (
        <Alert tone="danger" title="Não foi possível carregar as facas">
          <button className="font-semibold underline" onClick={() => load(q)}>
            Tentar de novo
          </button>
        </Alert>
      ) : (
        <>
          {/* celular: cartões */}
          <ul
            className="flex flex-col gap-3 md:hidden"
            aria-label="Facas salvas"
            aria-busy={rows == null || undefined}
          >
            {rows == null &&
              [0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="h-24 rounded-lg bg-surface-sunken [animation:pulse-soft_1.4s_ease-in-out_infinite]"
                />
              ))}
            {rows?.length === 0 && (
              <li className="rounded-lg border border-border bg-surface p-6 text-center text-text-muted">
                {q ? (
                  <>Nenhuma faca encontrada para “{q}”.</>
                ) : (
                  <>
                    Nenhuma faca salva ainda.{" "}
                    <Link
                      href="/"
                      className="font-semibold text-accent underline"
                    >
                      Criar a primeira
                    </Link>
                  </>
                )}
              </li>
            )}
            {rows?.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-2 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/criar/${r.modelSlug}?d=${r.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {r.nome}
                  </Link>
                  <p className="text-sm text-text-muted">
                    {nomeModelo(r.modelSlug)}
                    {r.cliente && <> · {r.cliente}</>}
                  </p>
                  <p className="num text-sm text-text">
                    {formatMm(r.largura)} × {formatMm(r.altura)} ×{" "}
                    {formatMm(r.profundidade)} mm
                    {r.osNumero && (
                      <span className="text-text-muted">
                        {" "}
                        · O.S. {r.osNumero}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`Excluir ${r.nome}`}
                  title="Excluir"
                  onClick={() => setToDelete(r)}
                >
                  <Trash2 size={16} aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <DataTable<DielineRecord>
              caption="Facas salvas"
              loading={rows == null}
              rows={rows ?? []}
              empty={
                q ? (
                  <>Nenhuma faca encontrada para “{q}”.</>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <span>Nenhuma faca salva ainda.</span>
                    <Link
                      href="/"
                      className="font-semibold text-accent underline"
                    >
                      Criar a primeira
                    </Link>
                  </div>
                )
              }
              columns={[
                {
                  key: "nome",
                  label: "Nome",
                  render: (r) => (
                    <Link
                      href={`/criar/${r.modelSlug}?d=${r.id}`}
                      className="font-medium text-accent hover:underline [overflow-wrap:anywhere]"
                    >
                      {r.nome}
                    </Link>
                  ),
                },
                {
                  key: "modelo",
                  label: "Modelo",
                  render: (r) => <Badge>{nomeModelo(r.modelSlug)}</Badge>,
                },
                {
                  key: "cliente",
                  label: "Cliente",
                  render: (r) =>
                    r.cliente ?? <span className="text-text-subtle">—</span>,
                },
                {
                  key: "os",
                  label: "O.S.",
                  numeric: true,
                  render: (r) =>
                    r.osNumero ?? <span className="text-text-subtle">—</span>,
                },
                {
                  key: "medidas",
                  label: "L × A × P (mm)",
                  numeric: true,
                  render: (r) =>
                    `${formatMm(r.largura)} × ${formatMm(r.altura)} × ${formatMm(r.profundidade)}`,
                },
                {
                  key: "data",
                  label: "Atualizada",
                  numeric: true,
                  render: (r) => fmtData(r.updatedAt),
                },
                {
                  key: "acoes",
                  label: "Ações",
                  numeric: true,
                  render: (r) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Excluir ${r.nome}`}
                      title="Excluir"
                      onClick={() => setToDelete(r)}
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </>
      )}

      <Dialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir faca?"
        description={
          toDelete
            ? `“${toDelete.nome}” sai da lista. Os arquivos já exportados continuam no histórico.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={excluir}>
            <Trash2 size={16} aria-hidden /> Excluir
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

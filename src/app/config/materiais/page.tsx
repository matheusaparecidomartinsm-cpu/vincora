"use client";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Alert, Badge } from "@/components/ui/feedback";
import { DataTable } from "@/components/ui/layout-parts";
import { MeasureField, formatMm } from "@/components/ui/measure-field";
import { Dialog } from "@/components/ui/overlay";
import { Page, TextInput } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast-host";
import { data, type Material, type Member } from "@/lib/data";
import { ConfigNav } from "../config-nav";

export default function MateriaisPage() {
  const [me, setMe] = useState<Member | null>(null);
  const [rows, setRows] = useState<Material[] | null>(null);
  const [arquivados, setArquivados] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<Material | "novo" | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    setError(false);
    data
      .listMaterials({ incluirArquivados: arquivados })
      .then(setRows)
      .catch(() => setError(true));
  }, [arquivados]);

  useEffect(() => {
    data.currentUser().then(setMe);
  }, []);
  useEffect(load, [load]);

  const isAdmin = me?.papel === "admin";

  async function toggleArquivo(m: Material) {
    await data.setMaterialArchived(m.id, !m.arquivado);
    toast({ tone: "success", title: m.arquivado ? "Material reativado" : "Material arquivado", description: m.nome });
    load();
  }

  return (
    <Page
      title="Configurações"
      description="Cartões usados na fábrica. A espessura de cada um entra no cálculo das folgas da faca."
      actions={
        isAdmin && (
          <Button onClick={() => setEditing("novo")}>
            <Plus size={16} aria-hidden /> Novo material
          </Button>
        )
      }
    >
      <ConfigNav />
      {me && !isAdmin && (
        <Alert tone="info" title="Somente leitura">
          Só administradores cadastram e editam materiais.
        </Alert>
      )}
      <Switch label="Mostrar arquivados" checked={arquivados} onCheckedChange={setArquivados} />

      {error ? (
        <Alert tone="danger" title="Não foi possível carregar os materiais">
          <button className="font-semibold underline" onClick={load}>
            Tentar de novo
          </button>
        </Alert>
      ) : (
        <DataTable<Material>
          caption="Materiais"
          loading={rows == null}
          rows={rows ?? []}
          empty={
            <div className="flex flex-col items-center gap-3">
              <span>Nenhum material cadastrado.</span>
              {isAdmin && (
                <Button variant="secondary" onClick={() => setEditing("novo")}>
                  Cadastrar o primeiro
                </Button>
              )}
            </div>
          }
          columns={[
            {
              key: "nome",
              label: "Material",
              render: (m) => (
                <span className="flex items-center gap-2 [overflow-wrap:anywhere]">
                  {m.nome} {m.arquivado && <Badge>Arquivado</Badge>}
                </span>
              ),
            },
            { key: "g", label: "Gramatura (g/m²)", numeric: true, render: (m) => m.gramaturaG ?? <span className="text-text-subtle">—</span> },
            { key: "e", label: "Espessura (mm)", numeric: true, render: (m) => formatMm(m.espessuraMm, 3) },
            {
              key: "acoes",
              label: "Ações",
              numeric: true,
              render: (m) =>
                isAdmin ? (
                  <span className="inline-flex gap-1">
                    <Button variant="ghost" size="sm" iconOnly aria-label={`Editar ${m.nome}`} title="Editar" onClick={() => setEditing(m)}>
                      <Pencil size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`${m.arquivado ? "Reativar" : "Arquivar"} ${m.nome}`}
                      title={m.arquivado ? "Reativar" : "Arquivar"}
                      onClick={() => toggleArquivo(m)}
                    >
                      {m.arquivado ? <ArchiveRestore size={16} aria-hidden /> : <Archive size={16} aria-hidden />}
                    </Button>
                  </span>
                ) : null,
            },
          ]}
        />
      )}

      <MaterialDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(m, novo) => {
          setEditing(null);
          toast({ tone: "success", title: novo ? "Material cadastrado" : "Material atualizado", description: m.nome });
          load();
        }}
      />
    </Page>
  );
}

function MaterialDialog({ editing, onClose, onSaved }: { editing: Material | "novo" | null; onClose: () => void; onSaved: (m: Material, novo: boolean) => void }) {
  const [nome, setNome] = useState("");
  const [gram, setGram] = useState<number | null>(null);
  const [esp, setEsp] = useState<number | null>(null);
  const [err, setErr] = useState<{ nome?: string; esp?: string; geral?: string }>({});
  const [busy, setBusy] = useState(false);
  const m = editing && editing !== "novo" ? editing : null;

  useEffect(() => {
    if (!editing) return;
    setNome(m?.nome ?? "");
    setGram(m?.gramaturaG ?? null);
    setEsp(m?.espessuraMm ?? null);
    setErr({});
  }, [editing, m]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof err = {};
    if (!nome.trim()) errs.nome = "Informe o nome.";
    if (esp == null || esp < 0.1 || esp > 3) errs.esp = "Entre 0,1 e 3 mm.";
    setErr(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const saved = await data.saveMaterial({ id: m?.id, nome, gramaturaG: gram != null ? Math.round(gram) : null, espessuraMm: esp! });
      onSaved(saved, !m);
    } catch (x) {
      setErr({ geral: x instanceof Error ? x.message : "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()} title={m ? "Editar material" : "Novo material"} description="Meça a espessura com micrômetro, no cartão já impresso se possível.">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {err.geral && <Alert tone="danger" title={err.geral} />}
        <TextInput name="nome" label="Nome" value={nome} onChange={setNome} placeholder="Ex.: Duplex 300 g" autoFocus error={err.nome} />
        <div className="grid grid-cols-2 gap-3">
          <MeasureField label="Gramatura" unit="g/m²" decimals={0} value={gram} onChange={setGram} help="Opcional" />
          <MeasureField label="Espessura" decimals={3} value={esp} onChange={setEsp} error={err.esp} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

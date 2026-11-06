"use client";
import { ArrowLeft, Download, Save } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DielineViewer } from "@/components/dieline/dieline-viewer";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/controls";
import { Alert, Badge, RuleNotice } from "@/components/ui/feedback";
import { SpecSummary } from "@/components/ui/layout-parts";
import { MeasureField, formatMm } from "@/components/ui/measure-field";
import { Dialog } from "@/components/ui/overlay";
import { TextInput } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast-host";
import { data, type DielineRecord, type Material } from "@/lib/data";
import { build, CATEGORIAS, MODELS } from "@/lib/dieline/models";
import { smallestPaper } from "@/lib/dieline/paper";
import type { Dieline, Spec } from "@/lib/dieline/types";

const MANUAL = "__manual";

export function Editor({ slug }: { slug: string }) {
  const { meta } = MODELS[slug];
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const savedId = params.get("d");

  const [L, setL] = useState<number | null>(null);
  const [A, setA] = useState<number | null>(null);
  const [P, setP] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [materialId, setMaterialId] = useState<string>(MANUAL);
  const [espessura, setEspessura] = useState<number | null>(0.345);
  const [sangria, setSangria] = useState(true);
  const [cola, setCola] = useState(true);
  const [record, setRecord] = useState<DielineRecord | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "notfound" | "error">(savedId ? "loading" : "idle");
  const [exporting, setExporting] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // materiais
  useEffect(() => {
    let alive = true;
    data
      .listMaterials()
      .then((ms) => {
        if (!alive) return;
        setMaterials(ms);
        if (!savedId) {
          const padrao = ms.find((m) => Math.abs(m.espessuraMm - 0.345) < 1e-6) ?? ms[0];
          if (padrao) {
            setMaterialId(padrao.id);
            setEspessura(padrao.espessuraMm);
          }
        }
      })
      .catch(() => alive && setMaterials([]));
    return () => {
      alive = false;
    };
  }, [savedId]);

  // faca salva
  useEffect(() => {
    if (!savedId) {
      setRecord(null);
      setLoadState("idle");
      return;
    }
    let alive = true;
    setLoadState("loading");
    data
      .getDieline(savedId)
      .then((r) => {
        if (!alive) return;
        if (!r || r.modelSlug !== meta.slug) return setLoadState("notfound");
        setRecord(r);
        setL(r.largura);
        setA(r.altura);
        setP(r.profundidade);
        setEspessura(r.espessura);
        setMaterialId(r.materialId ?? MANUAL);
        setSangria(r.sangria);
        setCola(r.areasCola);
        setLoadState("idle");
      })
      .catch(() => alive && setLoadState("error"));
    return () => {
      alive = false;
    };
  }, [savedId, meta.slug]);

  const input = useMemo(
    () => ({
      model: meta.slug,
      largura: L ?? undefined,
      altura: A ?? undefined,
      profundidade: P ?? undefined,
      espessura: espessura ?? undefined,
      sangria,
      areasCola: cola,
    }),
    [meta.slug, L, A, P, espessura, sangria, cola],
  );
  const vazio = L == null && A == null && P == null;
  const result = useMemo(() => (vazio ? null : build(input as Partial<Spec> & { model: string })), [input, vazio]);
  const lastValid = useRef<Dieline | null>(null);
  if (result?.ok) lastValid.current = result.dieline;
  const dieline = result?.ok ? result.dieline : vazio ? null : lastValid.current;
  const errors = result && !result.ok ? result.errors : {};
  const paper = result?.ok ? smallestPaper(result.dieline.bbox.w, result.dieline.bbox.h) : null;

  // Só mostra "obrigatório" depois que a pessoa mexeu em algum campo
  const fieldErr = (k: keyof Spec, v: number | null) => (v == null ? undefined : errors[k]);
  const ruleErr = [fieldErr("largura", L), fieldErr("altura", A), fieldErr("profundidade", P)].find(Boolean);

  function onMaterial(id: string) {
    setMaterialId(id);
    const m = materials?.find((x) => x.id === id);
    if (m) setEspessura(m.espessuraMm);
  }

  async function exportar() {
    if (!result?.ok) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: result.spec, os: record?.osNumero, cliente: record?.cliente }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Falha ao gerar os arquivos.");
      const blob = await res.blob();
      const filename = res.headers.get("X-Filename") ?? "faca.zip";
      const baixar = () => downloadBlob(blob, filename);
      baixar();
      await data.recordExport({
        dielineId: record?.id ?? null,
        modelSlug: meta.slug,
        spec: result.spec,
        motorVersao: res.headers.get("X-Motor") ?? "",
        filename,
        bboxW: result.dieline.bbox.w,
        bboxH: result.dieline.bbox.h,
        papel: res.headers.get("X-Papel") ?? "",
      });
      toast({ tone: "success", title: "Arquivos gerados", description: filename, action: { label: "Baixar de novo", onClick: baixar } });
    } catch (e) {
      toast({ tone: "danger", title: "Não foi possível exportar", description: e instanceof Error ? e.message : "Tente de novo." });
    } finally {
      setExporting(false);
    }
  }

  async function salvar(v: { nome: string; os: string; cliente: string }) {
    if (!result?.ok) return;
    const rec = await data.saveDieline({
      id: record?.id,
      modelSlug: meta.slug,
      nome: v.nome,
      largura: result.spec.largura,
      altura: result.spec.altura,
      profundidade: result.spec.profundidade,
      materialId: materialId === MANUAL ? null : materialId,
      espessura: result.spec.espessura,
      sangria,
      areasCola: cola,
      osNumero: v.os.trim() || null,
      cliente: v.cliente.trim() || null,
    });
    setRecord(rec);
    setSaveOpen(false);
    toast({ tone: "success", title: record ? "Faca atualizada" : "Faca salva", description: rec.nome });
    if (!savedId) router.replace(`/criar/${meta.slug}?d=${rec.id}`, { scroll: false });
  }

  if (loadState === "loading") return <EditorSkeleton />;
  if (loadState === "notfound" || loadState === "error")
    return (
      <div className="mx-auto max-w-content-max px-4 py-8">
        <Alert tone="danger" title={loadState === "notfound" ? "Faca não encontrada" : "Não foi possível abrir a faca"}>
          {loadState === "notfound" ? "Ela pode ter sido excluída. " : "Tente recarregar a página. "}
          <Link href={`/criar/${meta.slug}`} className="font-semibold underline">
            Começar uma nova
          </Link>
        </Alert>
      </div>
    );

  const espLabel = espessura != null ? `${formatMm(espessura, 3)} mm` : "—";
  const matOptions = [
    ...(materials ?? []).map((m) => ({ value: m.id, label: m.nome, hint: `${formatMm(m.espessuraMm, 3)} mm` })),
    { value: MANUAL, label: "Outro (digitar espessura)" },
  ];

  return (
    <main id="conteudo" className="mx-auto grid max-w-editor-max gap-4 px-4 py-6 lg:grid-cols-[var(--l-editor-panel-w)_1fr]">
      <section aria-labelledby="h-editor" className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 lg:max-h-[calc(100vh-var(--l-header-h)-var(--l-gutter))] lg:overflow-y-auto">
        <div className="flex flex-col gap-2">
          <Link href={record ? "/facas" : "/"} className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:underline">
            <ArrowLeft size={14} aria-hidden /> {record ? "Facas salvas" : "Modelos"}
          </Link>
          <div className="flex items-start justify-between gap-3">
            <h1 id="h-editor" className="min-w-0 break-words text-lg font-semibold">
              {record ? record.nome : meta.nome}
            </h1>
            <Badge tone="accent">{CATEGORIAS[meta.categoria]}</Badge>
          </div>
          {record && (
            <p className="text-sm text-text-muted">
              {meta.nome}
              {record.osNumero && <> · O.S. <span className="num">{record.osNumero}</span></>}
              {record.cliente && <> · {record.cliente}</>}
            </p>
          )}
        </div>

        <RuleNotice>{meta.regra}</RuleNotice>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Medidas internas em milímetros</legend>
          <div className="grid grid-cols-3 gap-3">
            <MeasureField
              id="campo-largura"
              label={meta.campos.largura}
              value={L}
              onChange={setL}
              error={fieldErr("largura", L) ? "Fora da regra" : undefined}
              onPasteTriple={([a, b, c]) => {
                setL(a);
                setA(b);
                setP(c);
              }}
            />
            <MeasureField label={meta.campos.altura} value={A} onChange={setA} error={fieldErr("altura", A) ? "Fora da regra" : undefined} />
            <MeasureField
              label={meta.campos.profundidade}
              value={P}
              onChange={setP}
              error={fieldErr("profundidade", P) ? "Fora da regra" : undefined}
            />
          </div>
          <p className="text-xs text-text-muted">Dica: cole “70x150x40” no primeiro campo. Setas ↑↓ mudam 1 mm (Shift 10, Alt 0,1).</p>
        </fieldset>

        {ruleErr && <RuleNotice tone="danger">{ruleErr}</RuleNotice>}

        <div className="flex flex-col gap-3">
          {materials == null ? (
            <div className="h-16 rounded-md bg-surface-sunken [animation:pulse-soft_1.4s_ease-in-out_infinite]" aria-label="Carregando materiais" />
          ) : (
            <Select label="Material" value={materialId} onValueChange={onMaterial} options={matOptions} />
          )}
          {materialId === MANUAL && (
            <MeasureField label="Espessura do cartão" value={espessura} onChange={setEspessura} decimals={3} error={espessura != null ? errors.espessura : undefined} help="Em milímetros. Ex.: 0,345" />
          )}
          {materials && materials.length === 0 && (
            <p className="text-xs text-text-muted">
              Nenhum material cadastrado.{" "}
              <Link href="/config/materiais" className="text-accent underline">
                Cadastrar
              </Link>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <Switch label="Sangria de 3 mm" description="Contorno da área de impressão em volta da faca" checked={sangria} onCheckedChange={setSangria} />
          {meta.usaCola && <Switch label="Áreas de cola" description="Marca a faixa que recebe cola" checked={cola} onCheckedChange={setCola} />}
        </div>

        {result?.ok && (
          <SpecSummary
            rows={[
              { label: "Faca aberta", value: `${formatMm(result.dieline.bbox.w)} × ${formatMm(result.dieline.bbox.h)} mm` },
              { label: "Folha mínima", value: <Badge tone={paper?.name === "Plotter" ? "warning" : "accent"}>{paper?.name}</Badge> },
              { label: "Espessura", value: espLabel },
            ]}
          />
        )}
        {paper?.name === "Plotter" && <RuleNotice tone="warning">A faca passa do A0: o PDF sai no tamanho exato para plotter.</RuleNotice>}

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-auto flex gap-2 border-t border-border bg-surface p-4 lg:static lg:m-0 lg:border-0 lg:p-0">
          <Button className="flex-1" disabled={!result?.ok} loading={exporting} onClick={exportar}>
            <Download size={16} aria-hidden /> Exportar PDF, SVG e DXF
          </Button>
          <Button variant="secondary" iconOnly aria-label={record ? "Salvar alterações" : "Salvar faca"} title={record ? "Salvar alterações" : "Salvar faca"} disabled={!result?.ok} onClick={() => setSaveOpen(true)}>
            <Save size={16} aria-hidden />
          </Button>
        </div>
      </section>

      <section aria-label="Visualização da faca" className="h-[60vh] min-h-viewer-min-h lg:h-[calc(100vh-var(--l-header-h)-var(--l-gutter))]">
        <DielineViewer
          dieline={dieline}
          label={`Faca da ${meta.nome.toLowerCase()}`}
          invalid={!!result && !result.ok}
          emptyText="Digite largura, altura e profundidade para ver a faca."
        />
      </section>

      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} record={record} onSave={salvar} sugestao={result?.ok ? `${meta.nome} ${formatMm(result.spec.largura)}×${formatMm(result.spec.altura)}×${formatMm(result.spec.profundidade)}` : ""} />
    </main>
  );
}

function SaveDialog({
  open,
  onOpenChange,
  record,
  onSave,
  sugestao,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: DielineRecord | null;
  onSave: (v: { nome: string; os: string; cliente: string }) => Promise<void>;
  sugestao: string;
}) {
  const [nome, setNome] = useState("");
  const [os, setOs] = useState("");
  const [cliente, setCliente] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setNome(record?.nome ?? sugestao);
    setOs(record?.osNumero ?? "");
    setCliente(record?.cliente ?? "");
    setErr(null);
  }, [open, record, sugestao]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={record ? "Salvar alterações" : "Salvar faca"} description="Fica disponível para a equipe em Facas salvas.">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nome.trim()) return setErr("Dê um nome para a faca.");
          setBusy(true);
          try {
            await onSave({ nome, os, cliente });
          } catch (x) {
            setErr(x instanceof Error ? x.message : "Não foi possível salvar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextInput name="nome" label="Nome" value={nome} onChange={setNome} placeholder="Ex.: Caixa vela 200 ml" autoFocus error={err ?? undefined} />
        <div className="grid grid-cols-2 gap-3">
          <TextInput name="os" label="Nº da O.S." value={os} onChange={setOs} placeholder="Opcional" mono maxLength={20} />
          <TextInput name="cliente" label="Cliente" value={cliente} onChange={setCliente} placeholder="Opcional" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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

function EditorSkeleton() {
  const bar = "rounded-md bg-surface-sunken [animation:pulse-soft_1.4s_ease-in-out_infinite]";
  return (
    <main aria-busy className="mx-auto grid max-w-editor-max gap-4 px-4 py-6 lg:grid-cols-[var(--l-editor-panel-w)_1fr]">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
        <div className={`h-6 w-2/3 ${bar}`} />
        <div className={`h-14 ${bar}`} />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-16 ${bar}`} />
          ))}
        </div>
        <div className={`h-16 ${bar}`} />
      </div>
      <div className={`h-[60vh] ${bar}`} />
      <span className="sr-only">Carregando faca…</span>
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

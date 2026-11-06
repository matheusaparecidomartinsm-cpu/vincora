"use client";
import { Download, Save, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { DielineViewer } from "@/components/dieline/dieline-viewer";
import { build } from "@/lib/dieline/models";
import { Button } from "@/components/ui/button";
import { CategoryChips, Select, Switch, ViewTabs } from "@/components/ui/controls";
import { Alert, Badge, RuleNotice } from "@/components/ui/feedback";
import { DataTable, ModelCard, SpecSummary } from "@/components/ui/layout-parts";
import { MeasureField } from "@/components/ui/measure-field";
import { Dialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast-host";
import tokens from "@/design/tokens.json";

const textClass = { "2xl": "text-2xl", xl: "text-xl", lg: "text-lg", md: "text-md", sm: "text-sm", xs: "text-xs" } as const;

const materiais = [
  { value: "duplex-300", label: "Duplex 300 g", hint: "0,345 mm" },
  { value: "triplex-350", label: "Triplex 350 g", hint: "0,450 mm" },
  { value: "kraft-280", label: "Kraft 280 g", hint: "0,380 mm" },
];

type FacaRow = { nome: string; modelo: string; os: string; medidas: string; data: string };
const facas: FacaRow[] = [
  { nome: "Caixa vela 200 ml", modelo: "Fundo cartucho", os: "48213", medidas: "70 × 150 × 40", data: "05/11/2026" },
  { nome: "Display sachê", modelo: "Display fundo automático", os: "48190", medidas: "120 × 90 × 140", data: "03/11/2026" },
];

export default function DesignPage() {
  const [L, setL] = useState<number | null>(70);
  const [A, setA] = useState<number | null>(150);
  const [P, setP] = useState<number | null>(40);
  const [mat, setMat] = useState("duplex-300");
  const [sangria, setSangria] = useState(true);
  const [cola, setCola] = useState(true);
  const [cat, setCat] = useState("todos");
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const pErr = P != null && P > 50 ? "No fundo cartucho a profundidade vai até 50 mm." : undefined;
  const valid = L && A && P && !pErr;
  const dieline = useMemo(() => {
    if (!L || !A || !P) return null;
    const r = build({ model: "fundo-cartucho", largura: L, altura: A, profundidade: Math.min(P, 50), espessura: 0.345, sangria, areasCola: cola });
    return r.ok ? r.dieline : null;
  }, [L, A, P, sangria, cola]);
  const thumb = useMemo(() => {
    const r = build({ model: "fundo-cartucho", largura: 60, altura: 110, profundidade: 35, espessura: 0.345, sangria: false, areasCola: false });
    return r.ok ? r.dieline : null;
  }, []);

  function exportar() {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      toast({ tone: "success", title: "Arquivos gerados", description: "faca-cartucho-70x150x40.zip", action: { label: "Baixar de novo", onClick: () => {} } });
    }, 900);
  }

  return (
    <>
      <main id="conteudo" className="mx-auto flex max-w-content-max flex-col gap-12 px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Sistema de design</h1>
          <p className="max-w-[60ch] text-md text-text-muted">
            Primitivas da ferramenta em isolamento. Tokens em <code className="num text-sm">replica/design/tokens.json</code>.
            A faca desta página vem do motor real (fundo cartucho, cartão 0,345 mm).
          </p>
        </div>

        {/* Composição do editor (S06) */}
        <Section title="Editor (S06) — composição">
          <div className="grid gap-4 lg:grid-cols-[var(--l-editor-panel-w)_1fr]">
            <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Caixa fundo cartucho</h3>
                <Badge tone="accent">Caixa</Badge>
              </div>
              <RuleNotice>Medidas internas da caixa montada. Profundidade até 50 mm.</RuleNotice>
              <div className="grid grid-cols-3 gap-3">
                <MeasureField label="Largura" value={L} onChange={setL} />
                <MeasureField label="Altura" value={A} onChange={setA} />
                <MeasureField label="Profund." value={P} onChange={setP} error={pErr ? "Máx. 50" : undefined} />
              </div>
              {pErr && <RuleNotice tone="danger">{pErr} Para caixas mais fundas, use o fundo automático.</RuleNotice>}
              <Select label="Material" value={mat} onValueChange={setMat} options={materiais} />
              <div className="flex flex-col gap-4 border-t border-border pt-4">
                <Switch label="Sangria de 3 mm" description="Desenha a área de sangria em volta da faca" checked={sangria} onCheckedChange={setSangria} />
                <Switch label="Áreas de cola" description="Marca onde vai a cola" checked={cola} onCheckedChange={setCola} />
              </div>
              {dieline && (
                <SpecSummary
                  rows={[
                    { label: "Faca aberta", value: `${fmt(dieline.bbox.w)} × ${fmt(dieline.bbox.h)} mm` },
                    { label: "Papel mínimo", value: <Badge tone="accent">A3</Badge> },
                    { label: "Espessura", value: materiais.find((m) => m.value === mat)?.hint },
                  ]}
                />
              )}
              <div className="flex gap-2">
                <Button className="flex-1" disabled={!valid} loading={exporting} onClick={exportar}>
                  <Download size={16} aria-hidden /> Exportar PDF, SVG e DXF
                </Button>
                <Dialog
                  title="Salvar faca"
                  description="Fica disponível para toda a equipe em Facas salvas."
                  trigger={
                    <Button variant="secondary" iconOnly aria-label="Salvar faca" disabled={!valid}>
                      <Save size={16} aria-hidden />
                    </Button>
                  }
                >
                  <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                    <TextField label="Nome" placeholder="Ex.: Caixa vela 200 ml" />
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="Nº da O.S." placeholder="Opcional" mono />
                      <TextField label="Cliente" placeholder="Opcional" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost">Cancelar</Button>
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>
                </Dialog>
              </div>
            </div>
            <div className="h-[560px]">
              <DielineViewer dieline={dieline} label="Faca da caixa fundo cartucho" invalid={!!pErr} />
            </div>
          </div>
        </Section>

        <Section title="Cores (papéis)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Object.entries(tokens.color).map(([k, v]) => (
              <div key={k} className="overflow-hidden rounded-md border border-border bg-surface">
                <div className="h-12" style={{ background: `var(--c-${k})` }} />
                <div className="p-2">
                  <p className="text-xs font-medium">{k}</p>
                  <p className="num text-xs text-text-subtle">{v}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Tipografia">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            {(["2xl", "xl", "lg", "md", "sm", "xs"] as const).map((s) => (
              <div key={s} className="flex items-baseline gap-6">
                <span className="num w-16 shrink-0 text-xs text-text-subtle">{s}</span>
                <span className={textClass[s]}>Faca planificada com vinco e corte</span>
              </div>
            ))}
            <div className="flex items-baseline gap-6">
              <span className="num w-16 shrink-0 text-xs text-text-subtle">mono</span>
              <span className="num text-md">234,3 × 260,0 mm · O.S. 48213</span>
            </div>
          </div>
        </Section>

        <Section title="Button">
          <Row label="variantes">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger"><Trash2 size={16} aria-hidden /> Excluir</Button>
          </Row>
          <Row label="tamanhos">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
            <Button iconOnly aria-label="Baixar" variant="secondary"><Download size={16} aria-hidden /></Button>
          </Row>
          <Row label="estados">
            <Button disabled>Desabilitado</Button>
            <Button loading>Carregando</Button>
            <Button variant="secondary" loading>Carregando</Button>
          </Row>
        </Section>

        <Section title="MeasureField">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MeasureField label="Vazio" value={null} onChange={() => {}} help="↑↓ ±1 · Shift ±10 · Alt ±0,1" />
            <MeasureField label="Válido" value={70.5} onChange={() => {}} />
            <MeasureField label="Inválido" value={62} onChange={() => {}} error="Profundidade até 50 mm" />
            <MeasureField label="Espessura" value={0.345} decimals={3} onChange={() => {}} disabled help="Vem do material" />
          </div>
        </Section>

        <Section title="Avisos">
          <div className="grid gap-3 md:grid-cols-3">
            <RuleNotice>Profundidade maior ou igual à largura.</RuleNotice>
            <RuleNotice tone="warning">Faca aberta passa de A2 — vai precisar de plotter.</RuleNotice>
            <RuleNotice tone="danger">Altura não pode passar da profundidade neste modelo.</RuleNotice>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Alert tone="success" title="Faca salva">Disponível em Facas salvas.</Alert>
            <Alert tone="danger" title="Não foi possível exportar">Tente de novo. Se continuar, avise o admin.</Alert>
          </div>
          <Row label="badges">
            <Badge>Neutro</Badge><Badge tone="accent">A3</Badge><Badge tone="success">Aprovado</Badge>
            <Badge tone="warning">Plotter</Badge><Badge tone="danger">Fora da regra</Badge>
          </Row>
        </Section>

        <Section title="Select, Switch, Chips, Tabs">
          <div className="grid gap-6 md:grid-cols-3">
            <Select label="Material" value={mat} onValueChange={setMat} options={materiais} />
            <Select
              label="Material (vazio)"
              onValueChange={() => {}}
              options={[]}
              emptyText={<>Nenhum material cadastrado. <a className="text-accent underline" href="#">Cadastrar</a></>}
            />
            <div className="flex flex-col gap-4">
              <Switch label="Ligado" checked onCheckedChange={() => {}} />
              <Switch label="Desabilitado" checked={false} onCheckedChange={() => {}} disabled />
            </div>
          </div>
          <CategoryChips
            label="Filtrar por categoria"
            active={cat}
            onChange={setCat}
            items={[
              { value: "todos", label: "Todos" },
              { value: "caixa", label: "Caixas" },
              { value: "display", label: "Displays" },
              { value: "sacola", label: "Sacolas" },
            ]}
          />
          <div className="max-w-md">
            <ViewTabs
              tabs={[
                { value: "2d", label: "Faca 2D", content: <p className="text-sm text-text-muted">Viewer 2D aqui.</p> },
                { value: "3d", label: "Caixa 3D", content: <p className="text-sm text-text-muted">Viewer 3D (milestone M3).</p> },
              ]}
            />
          </div>
        </Section>

        <Section title="ModelCard (S02)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ModelCard slug="fundo-cartucho" nome="Caixa fundo cartucho" categoria="Caixa" preview={thumb} />
            <ModelCard slug="fundo-automatico" nome="Caixa fundo automático" categoria="Caixa" preview={thumb} />
            <ModelCard slug="sacola" nome="Sacola de papel" categoria="Sacola" preview={thumb} enabled={false} />
            <ModelCard slug="caixa-gaveta" nome="Caixa gaveta" categoria="Gaveta" preview={thumb} enabled={false} />
          </div>
        </Section>

        <Section title="DataTable (/facas)">
          <DataTable<FacaRow>
            caption="Facas salvas"
            rows={facas}
            empty="Nenhuma faca salva ainda."
            columns={[
              { key: "nome", label: "Nome", render: (r) => r.nome },
              { key: "modelo", label: "Modelo", render: (r) => <Badge>{r.modelo}</Badge> },
              { key: "os", label: "O.S.", numeric: true, render: (r) => r.os },
              { key: "medidas", label: "L × A × P (mm)", numeric: true, render: (r) => r.medidas },
              { key: "data", label: "Atualizada", numeric: true, render: (r) => r.data },
            ]}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <DataTable<FacaRow> caption="Vazio" rows={[]} empty="Nenhuma faca salva ainda." columns={[{ key: "n", label: "Nome", render: (r) => r.nome }]} />
            <DataTable<FacaRow> caption="Carregando" rows={[]} loading empty="" columns={[{ key: "n", label: "Nome", render: (r) => r.nome }, { key: "o", label: "O.S.", render: (r) => r.os }]} />
          </div>
        </Section>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-border pb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="num w-24 text-xs text-text-subtle">{label}</span>
      {children}
    </div>
  );
}
function TextField({ label, placeholder, mono }: { label: string; placeholder?: string; mono?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        placeholder={placeholder}
        className={`h-control-md rounded-md border border-border-input bg-surface px-3 text-md font-normal placeholder:text-text-subtle ${mono ? "num" : ""}`}
      />
    </label>
  );
}
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

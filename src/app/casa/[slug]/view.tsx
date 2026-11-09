"use client";
import { Download, ImagePlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Box3D, acabamentoDoMaterial } from "@/components/dieline/box-3d";
import { DielineViewer } from "@/components/dieline/dieline-viewer";
import { Button } from "@/components/ui/button";
import { Select, Switch, ViewTabs } from "@/components/ui/controls";
import { Alert } from "@/components/ui/feedback";
import { data, type Material } from "@/lib/data";
import { LINHAS } from "@/lib/dieline/models";
import { toDXF } from "@/lib/dieline/render/dxf";
import { toPDF } from "@/lib/dieline/render/pdf";
import { toSVG } from "@/lib/dieline/render/svg";
import type { FaceDobra } from "@/lib/dieline/fold3d-three";
import type { Dieline } from "@/lib/dieline/types";
import { mm, type FacaCasa } from "@/lib/facas-casa";
import { carregarArte } from "@/lib/facas-casa/arte";

function baixar(data: BlobPart, tipo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([data], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FacaCasaView({ f }: { f: FacaCasa }) {
  const [dl, setDl] = useState<Dieline | null>(null);
  const [erro, setErro] = useState(false);
  const [faces, setFaces] = useState<FaceDobra[] | null>(null);
  const padrao = `/facas-casa/${f.slug}.arte.jpg`;
  const [arteCliente, setArteCliente] = useState<{ src: string; nome: string } | null>(null);
  const [verArte, setVerArte] = useState(true);
  const [lendo, setLendo] = useState(false);
  const [erroArte, setErroArte] = useState<string | null>(null);
  const arteSrc = verArte ? (arteCliente?.src ?? padrao) : null;

  async function onArquivo(file: File | undefined) {
    if (!file) return;
    setLendo(true);
    setErroArte(null);
    try {
      setArteCliente({ src: await carregarArte(file, f), nome: file.name });
      setVerArte(true);
    } catch {
      setErroArte("Não foi possível ler este arquivo. Use PDF, PNG ou JPG.");
    } finally {
      setLendo(false);
    }
  }
  const [gerando, setGerando] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState("");

  useEffect(() => {
    data
      .listMaterials()
      .then((ms) => {
        setMaterials(ms);
        setMaterialId((atual) => atual || (ms.find((m) => /kraft/i.test(m.nome)) ?? ms[0])?.id || "");
      })
      .catch(() => setMaterials([]));
  }, []);
  const material = materials.find((m) => m.id === materialId);

  useEffect(() => {
    fetch(`/facas-casa/${f.slug}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDl)
      .catch(() => setErro(true));
    fetch(`/facas-casa/${f.slug}.3d.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setFaces)
      .catch(() => setFaces(null));
  }, [f.slug]);

  const base = `faca-${f.slug}-${[f.produto, f.faca].filter(Boolean).join("-")}`;
  const linha = LINHAS.find((l) => l.value === f.linha)?.label;

  async function pdf() {
    if (!dl) return;
    setGerando(true);
    try {
      const bytes = await toPDF(dl, {
        titulo: base,
        modeloNome: `${f.nome} (${[f.produto, f.faca, f.fb, f.bl].filter(Boolean).join(" · ")})`,
        validado: true,
        spec: { model: f.slug, largura: f.largura, altura: f.altura, profundidade: f.profundidade, espessura: 0, sangria: false, areasCola: false },
        motorVersao: "arte",
        data: new Date(),
      });
      baixar(bytes as BlobPart, "application/pdf", `${base}.pdf`);
    } finally {
      setGerando(false);
    }
  }

  const linhas: [string, string][] = [
    ["Medidas internas (fundo)", `${mm(f.largura)} × ${mm(f.profundidade)} mm`],
    ["Boca (topo)", `${mm(f.topo.largura)} × ${mm(f.topo.profundidade)} mm`],
    ["Altura da parede", `${mm(f.altura)} mm`],
    ["Faca aberta", `${mm(f.aberta.w)} × ${mm(f.aberta.h)} mm`],
    ["Produto", f.produto],
    ["Faca", f.faca ?? "—"],
    ["Ficha (FB)", f.fb ?? "—"],
    ["Clichê/bloco (BL)", f.bl ?? "—"],
  ];

  return (
    <main id="conteudo" className="mx-auto grid max-w-content-max gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
      <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
        <div>
          <Link href="/" className="text-sm text-accent">
            ← Modelos
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-text">{f.nome}</h1>
          <p className="text-sm text-text-muted">{linha} · faca da casa</p>
        </div>
        <Alert tone="info" title="Faca tirada da arte aprovada">
          Geometria copiada do PDF da arte em escala 1:1. As medidas não podem ser alteradas aqui.
        </Alert>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-md bg-canvas p-4 text-sm">
          {linhas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-text-muted">{k}</dt>
              <dd className="text-right font-mono text-text">{v}</dd>
            </div>
          ))}
        </dl>
        {materials.length > 0 && (
          <Select
            label="Material"
            value={materialId}
            onValueChange={setMaterialId}
            options={materials.map((m) => ({ value: m.id, label: m.nome, hint: `${m.espessuraMm.toLocaleString("pt-BR")} mm` }))}
          />
        )}
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <Switch label="Mostrar arte" checked={verArte} onCheckedChange={setVerArte} />
          <p className="text-xs text-text-muted">
            {arteCliente ? `Arte do cliente: ${arteCliente.nome}` : "Arte padrão ProFood"}
          </p>
          <label className="flex h-control-md cursor-pointer items-center justify-center gap-2 rounded-md border border-border-strong text-sm font-semibold text-text hover:bg-surface-sunken">
            <ImagePlus size={16} aria-hidden />
            {lendo ? "Lendo a arte…" : "Carregar arte do cliente"}
            <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => onArquivo(e.target.files?.[0])} />
          </label>
          {arteCliente && (
            <button type="button" className="text-left text-xs text-accent underline" onClick={() => setArteCliente(null)}>
              Voltar para a arte padrão
            </button>
          )}
          {erroArte && <p className="text-xs text-danger">{erroArte}</p>}
          <p className="text-xs text-text-subtle">PDF no mesmo modelo da arte encaixa sozinho. Imagem (PNG/JPG) deve ser só a área da faca.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={pdf} loading={gerando} disabled={!dl}>
            <Download size={16} aria-hidden /> Baixar PDF 1:1
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!dl} onClick={() => dl && baixar(toSVG(dl, { titulo: base }), "image/svg+xml", `${base}.svg`)}>
              SVG
            </Button>
            <Button variant="secondary" disabled={!dl} onClick={() => dl && baixar(toDXF(dl), "application/dxf", `${base}.dxf`)}>
              DXF
            </Button>
          </div>
        </div>
      </section>
      <section aria-label="Visualização" className="h-[70vh] min-h-viewer-min-h lg:h-[calc(100vh-var(--l-header-h)-var(--l-gutter))]">
        <ViewTabs
          fill
          tabs={[
            {
              value: "2d",
              label: "Faca 2D",
              content: erro ? <Alert tone="danger" title="Não foi possível carregar a faca." /> : <DielineViewer dieline={dl} label={`Faca ${f.nome}`} emptyText="Carregando a faca…" arte={arteSrc} />,
            },
            {
              value: "3d",
              label: "Caixa 3D",
              content: (
                <Box3D
                  spec={{ model: f.slug, largura: f.largura, altura: f.altura, profundidade: f.profundidade, espessura: material?.espessuraMm ?? 0.4, sangria: false, areasCola: false, topo: f.topo }}
                  label={f.nome}
                  acabamento={acabamentoDoMaterial(material?.nome)}
                  faces={faces}
                  arte={arteSrc ? { src: arteSrc, w: f.aberta.w, h: f.aberta.h } : null}
                />
              ),
            },
          ]}
        />
      </section>
    </main>
  );
}

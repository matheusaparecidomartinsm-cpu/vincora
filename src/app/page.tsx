"use client";
import { useMemo, useState } from "react";
import { CategoryChips } from "@/components/ui/controls";
import { ModelCard } from "@/components/ui/layout-parts";
import { Page } from "@/components/ui/page";
import { build, CATALOGO, CATEGORIAS, MODELS } from "@/lib/dieline/models";

const PREVIEW_SPEC = { largura: 60, altura: 110, profundidade: 35, espessura: 0.345, sangria: false, areasCola: false };

export default function CatalogoPage() {
  const [cat, setCat] = useState("todos");

  const previews = useMemo(() => {
    const out: Record<string, ReturnType<typeof build>> = {};
    for (const slug of Object.keys(MODELS)) out[slug] = build({ model: slug, ...PREVIEW_SPEC });
    return out;
  }, []);

  const cats = useMemo(() => {
    const presentes = [...new Set(CATALOGO.map((m) => m.categoria))];
    return [{ value: "todos", label: "Todos" }, ...presentes.map((c) => ({ value: c, label: CATEGORIAS[c] }))];
  }, []);

  const lista = CATALOGO.filter((m) => cat === "todos" || m.categoria === cat);
  const prontos = lista.filter((m) => m.implementado);
  const emBreve = lista.filter((m) => !m.implementado);

  return (
    <Page
      title="Escolha o modelo"
      description="Digite as medidas internas, confira a faca na tela e exporte PDF, SVG e DXF em tamanho real."
    >
      <CategoryChips label="Filtrar por categoria" items={cats} active={cat} onChange={setCat} />

      {lista.length === 0 && <p className="text-text-muted">Nenhum modelo nesta categoria.</p>}

      {prontos.length > 0 && (
        <section aria-labelledby="h-prontos" className="flex flex-col gap-3">
          <h2 id="h-prontos" className="text-sm font-semibold text-text-muted">
            Disponíveis
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {prontos.map((m) => {
              const r = previews[m.slug];
              return (
                <ModelCard
                  key={m.slug}
                  slug={m.slug}
                  nome={m.nome}
                  categoria={CATEGORIAS[m.categoria]}
                  descricao={MODELS[m.slug]?.meta.descricao}
                  emValidacao={!MODELS[m.slug]?.meta.validado}
                  preview={r?.ok ? r.dieline : null}
                />
              );
            })}
          </div>
        </section>
      )}

      {emBreve.length > 0 && (
        <section aria-labelledby="h-breve" className="flex flex-col gap-3">
          <h2 id="h-breve" className="text-sm font-semibold text-text-muted">
            Em desenvolvimento
          </h2>
          <p className="text-sm text-text-muted">Cada modelo é liberado depois de aprovado em protótipo na fábrica.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {emBreve.map((m) => (
              <ModelCard key={m.slug} slug={m.slug} nome={m.nome} categoria={CATEGORIAS[m.categoria]} enabled={false} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

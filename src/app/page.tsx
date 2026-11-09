"use client";
import { useMemo, useState } from "react";
import { CategoryChips } from "@/components/ui/controls";
import { FacaCasaCard } from "@/components/ui/faca-casa-card";
import { ModelCard } from "@/components/ui/layout-parts";
import { FACAS_CASA } from "@/lib/facas-casa";
import { Page } from "@/components/ui/page";
import { build, CATALOGO, CATEGORIAS, LINHAS, LINHAS_DO_MODELO, MODELS } from "@/lib/dieline/models";

const PREVIEW_SPEC = { largura: 60, altura: 110, profundidade: 35, espessura: 0.345, sangria: false, areasCola: false };

export default function CatalogoPage() {
  const [cat, setCat] = useState("todos");

  const previews = useMemo(() => {
    const out: Record<string, ReturnType<typeof build>> = {};
    for (const slug of Object.keys(MODELS)) out[slug] = build({ model: slug, ...PREVIEW_SPEC });
    return out;
  }, []);

  const cats = [{ value: "todos", label: "Todos" }, ...LINHAS];

  const lista = CATALOGO.filter(
    (m) => m.implementado && (cat === "todos" || (LINHAS_DO_MODELO[m.slug] ?? []).includes(cat as never)),
  );
  const prontos = lista;
  const casa = FACAS_CASA.filter((f) => cat === "todos" || f.linha === cat);

  return (
    <Page
      title="Que caixa vamos riscar hoje?"
      description="Escolha o modelo, digite as medidas internas e leve para a produção o PDF, o SVG e o DXF em tamanho real."
    >
      <CategoryChips label="Filtrar por linha" items={cats} active={cat} onChange={setCat} />

      {lista.length === 0 && casa.length === 0 && <p className="text-text-muted">Ainda não há modelos nesta linha.</p>}

      {prontos.length > 0 && (
        <section aria-labelledby="h-prontos" className="flex flex-col gap-3">
          <h2 id="h-prontos" className="text-sm font-semibold text-text-muted">
            Gerar com medida livre
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

      {casa.length > 0 && (
        <section aria-labelledby="h-casa" className="flex flex-col gap-3">
          <h2 id="h-casa" className="text-sm font-semibold text-text-muted">
            Facas da casa
          </h2>
          <p className="text-sm text-text-muted">Facas reais da ProFood, tiradas das artes aprovadas, em tamanho real.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {casa.map((f) => (
              <FacaCasaCard key={f.slug} f={f} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

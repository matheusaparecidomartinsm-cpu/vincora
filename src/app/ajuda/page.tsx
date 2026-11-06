import type { Metadata } from "next";
import { Page } from "@/components/ui/page";

export const metadata: Metadata = { title: "Ajuda" };

const passos = [
  { t: "Escolha o modelo", d: "Na tela inicial, abra o tipo de embalagem. Cada modelo tem uma regra de medidas que aparece no topo do editor." },
  { t: "Digite as medidas internas", d: "Largura, altura e profundidade do espaço útil dentro da caixa montada, em milímetros. A faca é recalculada a cada número." },
  { t: "Escolha o material", d: "A espessura do cartão muda as folgas de dobra. Cadastre os cartões da fábrica em Configurações › Materiais." },
  { t: "Exporte e teste", d: "O .zip traz PDF, SVG e DXF em tamanho real. Imprima o PDF em 100 %, monte um protótipo e só então libere para produção." },
];

const faq = [
  {
    q: "Por que medidas internas?",
    a: "Porque é o que o produto precisa caber. O gerador soma a espessura do cartão em cada painel, então a mesma caixa sai um pouco maior num cartão mais grosso.",
  },
  {
    q: "O que vem em cada arquivo?",
    a: "PDF: para imprimir e conferir — corte, vinco e serrilha em cores especiais e camadas separadas, cotas de vinco a vinco, régua de 50 mm e carimbo. SVG: para editar no Illustrator, CorelDRAW ou Inkscape. DXF: só as linhas de produção, para plotter de recorte e CAD.",
  },
  {
    q: "Como confiro se a impressão saiu na escala certa?",
    a: "Meça a régua impressa no topo do PDF: ela tem que dar exatamente 50 mm. Se não der, a impressora reduziu a página — imprima em “tamanho real” ou 100 %.",
  },
  {
    q: "A cota mostra 70,3 e eu digitei 70. Está errado?",
    a: "Não. As cotas são de vinco a vinco e já incluem a folga pela espessura. O carimbo do PDF repete as medidas internas que você digitou.",
  },
  {
    q: "Posso mandar o arquivo direto para a faca de aço?",
    a: "Não sem protótipo. As folgas são valores de partida e cada cartão se comporta de um jeito. Monte uma amostra com o material final e ajuste se precisar.",
  },
  {
    q: "Por que só um modelo está disponível?",
    a: "Cada modelo só é liberado depois de aprovado em protótipo na fábrica. Os outros aparecem como “em desenvolvimento” na tela inicial.",
  },
];

export default function AjudaPage() {
  return (
    <Page title="Como usar" description="Do modelo ao arquivo de produção em quatro passos.">
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {passos.map((p, i) => (
          <li key={p.t} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
            <span aria-hidden className="num grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-sm font-medium text-on-accent-soft">
              {i + 1}
            </span>
            <h2 className="text-md font-semibold">{p.t}</h2>
            <p className="text-sm text-text-muted">{p.d}</p>
          </li>
        ))}
      </ol>
      <section aria-labelledby="h-faq" className="flex flex-col gap-3">
        <h2 id="h-faq" className="text-lg font-semibold">
          Perguntas frequentes
        </h2>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {faq.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-md font-medium text-text marker:hidden">
                <span className="mr-2 inline-block text-text-subtle transition-transform group-open:rotate-90" aria-hidden>
                  ›
                </span>
                {f.q}
              </summary>
              <p className="mt-2 pl-5 text-sm text-text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Page>
  );
}

import selada from "./selada.json";
import supermercado from "./supermercado.json";
import tableDinner from "./table-dinner.json";
import type { Linha } from "@/lib/dieline/models";

/**
 * Facas da casa: facas reais da ProFood, tiradas das artes de cliente (PDF) na escala 1:1.
 * Não são paramétricas — a geometria fica em /public/facas-casa/<slug>.json.
 * Medidas internas medidas de vinco a vinco no fundo da embalagem.
 */
export type FacaCasa = {
  slug: string;
  nome: string;
  produto: string;
  faca: string | null;
  fb: string | null;
  bl: string | null;
  linha: Linha;
  largura: number;
  profundidade: number;
  altura: number;
  aberta: { w: number; h: number };
  /** boca da bandeja (dobradiça da tampa × profundidade da tampa) e altura da lingueta, em mm */
  topo: { largura: number; profundidade: number; lingueta: number };
  /** página do PDF da arte (mm) e canto da faca dentro dela — para encaixar a arte do cliente */
  pdf: { pagina: [number, number]; origem: [number, number] };
  /** a montagem 3D automática ainda não representa bem esta faca */
  sem3d?: boolean;
};

export const FACAS_CASA = [...tableDinner, ...selada, ...supermercado] as FacaCasa[];
export const facaCasa = (slug: string) => FACAS_CASA.find((f) => f.slug === slug);
export const mm = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

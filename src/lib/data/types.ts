import type { Spec } from "@/lib/dieline/types";

/** Espelha as tabelas de replica/schema.sql (nomes em camelCase). */

export type Material = {
  id: string;
  orgId: string;
  nome: string;
  gramaturaG: number | null;
  espessuraMm: number;
  arquivado: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DielineRecord = {
  id: string;
  orgId: string;
  createdBy: string | null;
  modelSlug: string;
  nome: string;
  largura: number;
  altura: number;
  profundidade: number;
  materialId: string | null;
  espessura: number;
  sangria: boolean;
  areasCola: boolean;
  osNumero: string | null;
  cliente: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExportRecord = {
  id: string;
  orgId: string;
  dielineId: string | null;
  modelSlug: string;
  createdBy: string | null;
  spec: Spec;
  motorVersao: string;
  filename: string;
  bboxW: number;
  bboxH: number;
  papel: string;
  createdAt: string;
};

export type Member = { id: string; nome: string; email: string; papel: "admin" | "member" };

export type SaveDielineInput = Omit<DielineRecord, "id" | "orgId" | "createdBy" | "createdAt" | "updatedAt"> & { id?: string };
export type SaveMaterialInput = { id?: string; nome: string; gramaturaG: number | null; espessuraMm: number };

/** Contrato da camada de dados. A versão Supabase (/replica-backend) implementa a mesma interface. */
export interface DataLayer {
  currentUser(): Promise<Member>;
  listMaterials(opts?: { incluirArquivados?: boolean }): Promise<Material[]>;
  saveMaterial(input: SaveMaterialInput): Promise<Material>;
  setMaterialArchived(id: string, arquivado: boolean): Promise<void>;
  listDielines(opts?: { q?: string; model?: string }): Promise<DielineRecord[]>;
  getDieline(id: string): Promise<DielineRecord | null>;
  saveDieline(input: SaveDielineInput): Promise<DielineRecord>;
  deleteDieline(id: string): Promise<void>;
  recordExport(input: Omit<ExportRecord, "id" | "orgId" | "createdBy" | "createdAt">): Promise<ExportRecord>;
  listExports(opts?: { dielineId?: string; limit?: number }): Promise<ExportRecord[]>;
  listMembers(): Promise<Member[]>;
}

"use client";
/**
 * Camada de dados FALSA: guarda tudo no localStorage do navegador.
 * Mesmas assinaturas da versão Supabase — trocar a implementação não muda nenhuma tela.
 */
import type { DataLayer, DielineRecord, ExportRecord, Material, Member } from "./types";

const KEY = "gerador-facas:v1";
const ORG = "org-profood";
const ME: Member = { id: "u-matheus", nome: "Matheus A. Martins", email: "pcp@profood.com.br", papel: "admin" };

type DB = { materials: Material[]; dielines: DielineRecord[]; exports: ExportRecord[]; members: Member[] };

const now = () => new Date().toISOString();
const uid = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

function seed(): DB {
  const t = "2026-11-03T12:00:00.000Z";
  const mat = (id: string, nome: string, g: number, e: number): Material => ({
    id, orgId: ORG, nome, gramaturaG: g, espessuraMm: e, arquivado: false, createdAt: t, updatedAt: t,
  });
  const materials = [
    mat("m-duplex-250", "Duplex 250 g", 250, 0.3),
    mat("m-duplex-300", "Duplex 300 g", 300, 0.345),
    mat("m-triplex-350", "Triplex 350 g", 350, 0.45),
  ];
  const dl = (id: string, nome: string, l: number, a: number, p: number, os: string | null, cliente: string | null, at: string): DielineRecord => ({
    id, orgId: ORG, createdBy: ME.id, modelSlug: "fundo-cartucho", nome, largura: l, altura: a, profundidade: p,
    materialId: "m-duplex-300", espessura: 0.345, sangria: true, areasCola: true, osNumero: os, cliente, createdAt: at, updatedAt: at,
  });
  return {
    materials,
    dielines: [
      dl("d-1", "Caixa vela 200 ml", 70, 150, 40, "48213", "Velas Aurora", "2026-11-05T14:20:00.000Z"),
      dl("d-2", "Sachê de chá — caixa 10 un.", 80, 120, 35, null, null, "2026-11-04T10:05:00.000Z"),
    ],
    exports: [],
    members: [ME, { id: "u-vinicius", nome: "Vinícius", email: "vinicius@profood.com.br", papel: "member" }],
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* storage indisponível: segue com seed em memória */
  }
  const db = seed();
  save(db);
  return db;
}
function save(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignora */
  }
}

/** Pequena latência para as telas exercitarem o estado de carregamento. */
const delay = <T,>(v: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const fakeData: DataLayer = {
  async currentUser() {
    return delay(ME, 0);
  },
  async listMaterials(opts) {
    const db = load();
    return delay(db.materials.filter((m) => opts?.incluirArquivados || !m.arquivado).sort((a, b) => a.nome.localeCompare(b.nome)));
  },
  async saveMaterial(input) {
    const db = load();
    const nome = input.nome.trim();
    if (!nome) throw new Error("Informe o nome do material.");
    if (db.materials.some((m) => m.id !== input.id && norm(m.nome) === norm(nome))) throw new Error("Já existe um material com esse nome.");
    let rec: Material;
    if (input.id) {
      const i = db.materials.findIndex((m) => m.id === input.id);
      if (i < 0) throw new Error("Material não encontrado.");
      rec = { ...db.materials[i], ...input, nome, updatedAt: now() };
      db.materials[i] = rec;
    } else {
      rec = { id: uid(), orgId: ORG, nome, gramaturaG: input.gramaturaG, espessuraMm: input.espessuraMm, arquivado: false, createdAt: now(), updatedAt: now() };
      db.materials.push(rec);
    }
    save(db);
    return delay(rec);
  },
  async setMaterialArchived(id, arquivado) {
    const db = load();
    const m = db.materials.find((x) => x.id === id);
    if (m) {
      m.arquivado = arquivado;
      m.updatedAt = now();
    }
    save(db);
    return delay(undefined);
  },
  async listDielines(opts) {
    const db = load();
    const q = opts?.q ? norm(opts.q) : "";
    return delay(
      db.dielines
        .filter((d) => !opts?.model || d.modelSlug === opts.model)
        .filter((d) => !q || [d.nome, d.osNumero ?? "", d.cliente ?? ""].some((f) => norm(f).includes(q)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      250,
    );
  },
  async getDieline(id) {
    return delay(load().dielines.find((d) => d.id === id) ?? null);
  },
  async saveDieline(input) {
    const db = load();
    const nome = input.nome.trim();
    if (!nome) throw new Error("Dê um nome para a faca.");
    let rec: DielineRecord;
    if (input.id) {
      const i = db.dielines.findIndex((d) => d.id === input.id);
      if (i < 0) throw new Error("Faca não encontrada.");
      rec = { ...db.dielines[i], ...input, nome, updatedAt: now() } as DielineRecord;
      db.dielines[i] = rec;
    } else {
      rec = { ...input, nome, id: uid(), orgId: ORG, createdBy: ME.id, createdAt: now(), updatedAt: now() } as DielineRecord;
      db.dielines.push(rec);
    }
    save(db);
    return delay(rec);
  },
  async deleteDieline(id) {
    const db = load();
    db.dielines = db.dielines.filter((d) => d.id !== id);
    db.exports = db.exports.map((e) => (e.dielineId === id ? { ...e, dielineId: null } : e)); // histórico sobrevive
    save(db);
    return delay(undefined);
  },
  async recordExport(input) {
    const db = load();
    const rec: ExportRecord = { ...input, id: uid(), orgId: ORG, createdBy: ME.id, createdAt: now() };
    db.exports.unshift(rec);
    save(db);
    return delay(rec, 0);
  },
  async listExports(opts) {
    const db = load();
    return delay(db.exports.filter((e) => !opts?.dielineId || e.dielineId === opts.dielineId).slice(0, opts?.limit ?? 50));
  },
  async listMembers() {
    return delay(load().members);
  },
};

export function resetFakeData() {
  save(seed());
}

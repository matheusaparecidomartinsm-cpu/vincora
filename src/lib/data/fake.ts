"use client";
/**
 * Camada de dados FALSA: guarda tudo no localStorage do navegador.
 * Mesmas assinaturas da versão Supabase — trocar a implementação não muda nenhuma tela.
 */
import type { DataLayer, DielineRecord, ExportRecord, Invite, Material, Member } from "./types";

const KEY = "gerador-facas:v1";
const ORG = "org-profood";
const ME: Member = { id: "u-matheus", nome: "Matheus A. Martins", email: "pcp@profood.com.br", papel: "admin" };

type DB = { materials: Material[]; dielines: DielineRecord[]; exports: ExportRecord[]; members: Member[]; invites?: Invite[] };

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
    mat("m-black-300", "Black 300 g", 300, 0.4),
    mat("m-ecokraft-300", "Ecokraft 300 g", 300, 0.42),
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
  async setMemberRole(userId, papel) {
    const db = load();
    const admins = db.members.filter((m) => m.papel === "admin");
    if (papel === "member" && admins.length === 1 && admins[0].id === userId) throw new Error("A organização precisa de pelo menos um administrador.");
    db.members = db.members.map((m) => (m.id === userId ? { ...m, papel } : m));
    save(db);
    return delay(undefined);
  },
  async removeMember(userId) {
    const db = load();
    const alvo = db.members.find((m) => m.id === userId);
    if (alvo?.papel === "admin" && db.members.filter((m) => m.papel === "admin").length === 1) throw new Error("A organização precisa de pelo menos um administrador.");
    db.members = db.members.filter((m) => m.id !== userId);
    save(db);
    return delay(undefined);
  },
  async listInvites() {
    return delay(load().invites ?? []);
  },
  async invite(email, papel) {
    const db = load();
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("E-mail inválido.");
    if (db.members.some((m) => m.email.toLowerCase() === e)) throw new Error("Essa pessoa já está na equipe.");
    if ((db.invites ?? []).some((i) => i.email === e)) throw new Error("Já existe um convite pendente para esse e-mail.");
    db.invites = [...(db.invites ?? []), { id: uid(), email: e, papel, createdAt: now(), expiresAt: new Date(Date.now() + 14 * 864e5).toISOString() }];
    save(db);
    return delay({ emailEnviado: false });
  },
  async revokeInvite(id) {
    const db = load();
    db.invites = (db.invites ?? []).filter((i) => i.id !== id);
    save(db);
    return delay(undefined);
  },
  async updateMyName(nome) {
    const db = load();
    db.members = db.members.map((m) => (m.id === ME.id ? { ...m, nome } : m));
    save(db);
    return delay(undefined);
  },
};

export function resetFakeData() {
  save(seed());
}

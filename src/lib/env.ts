/**
 * Variáveis de ambiente. Sem NEXT_PUBLIC_SUPABASE_URL o app roda em modo local
 * (dados no navegador, sem login) — útil para desenvolver sem backend.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const BACKEND = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

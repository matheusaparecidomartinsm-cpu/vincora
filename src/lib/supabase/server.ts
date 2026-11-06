import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/** Cliente do servidor com a sessão do usuário (RLS vale normalmente). */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* chamado de Server Component: o middleware renova a sessão */
        }
      },
    },
  });
}

/**
 * Cliente ADMIN (ignora RLS). Só para: convite por e-mail e exclusão de conta.
 * A chave secreta nunca vai para o navegador.
 */
export function supabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Usuário autenticado + org atual, ou null. */
export async function requireUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: m } = await sb.from("org_members").select("org_id, papel").eq("user_id", data.user.id).order("created_at").limit(1).maybeSingle();
  return { sb, user: data.user, orgId: (m?.org_id as string | undefined) ?? null, papel: (m?.papel as "admin" | "member" | undefined) ?? null };
}

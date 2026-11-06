import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Volta dos e-mails do Supabase Auth (confirmação de cadastro, link mágico, convite, nova senha).
 * Aceita tanto `code` (PKCE) quanto `token_hash` + `type`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const sb = await supabaseServer();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await sb.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await sb.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("sem código") };

  if (error) return NextResponse.redirect(new URL("/login?erro=link", url.origin));

  await sb.rpc("accept_my_invites");
  if (type === "recovery") return NextResponse.redirect(new URL("/conta/nova-senha", url.origin));

  const { data: u } = await sb.auth.getUser();
  const { data: m } = await sb.from("org_members").select("org_id").eq("user_id", u.user?.id ?? "").limit(1).maybeSingle();
  return NextResponse.redirect(new URL(m ? next : "/bem-vindo", url.origin));
}

"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { TextInput } from "@/components/ui/page";
import { clearOrgCache } from "@/lib/data/supabase";
import { safeNext } from "@/lib/safe-next";
import { supabaseBrowser } from "@/lib/supabase/client";

const callback = (next = "/") => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

/** Mensagens do Supabase Auth em português, sem revelar se o e-mail existe. */
function traduz(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar (veja a caixa de entrada).";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Espere alguns minutos.";
  if (/password.*(short|least|weak)/i.test(msg)) return "Senha fraca: use pelo menos 10 caracteres.";
  if (/signups not allowed|signup.*disabled/i.test(msg)) return "Cadastro fechado. Peça um convite ao administrador.";
  return "Não foi possível concluir. Tente de novo.";
}

function Field({ label, type, value, onChange, autoComplete, name }: { label: string; type: string; value: string; onChange: (v: string) => void; autoComplete: string; name: string }) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-control-md rounded-md border border-border-input bg-surface px-3 text-md"
      />
    </div>
  );
}

async function destinoDepoisDoLogin(next: string) {
  const sb = supabaseBrowser();
  clearOrgCache();
  await sb.rpc("accept_my_invites");
  const { data: u } = await sb.auth.getUser();
  const { data: m } = await sb.from("org_members").select("org_id").eq("user_id", u.user?.id ?? "").limit(1).maybeSingle();
  return m ? next : "/bem-vindo";
}

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState<"senha" | "link" | null>(null);
  const [erro, setErro] = useState<string | null>(params.get("erro") === "link" ? "O link expirou ou já foi usado. Peça outro." : null);
  const [enviado, setEnviado] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setBusy("senha");
    setErro(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro(traduz(error.message));
      setBusy(null);
      window.dispatchEvent(new CustomEvent("login:resultado", { detail: "erro" }));
      return;
    }
    window.dispatchEvent(new CustomEvent("login:resultado", { detail: "ok" }));
    router.replace(await destinoDepoisDoLogin(next));
    router.refresh();
  }

  async function linkMagico() {
    if (!email.trim()) return setErro("Digite seu e-mail para receber o link.");
    setBusy("link");
    setErro(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: callback(next) } });
    setBusy(null);
    // mesma resposta exista ou não a conta
    if (error && /rate limit|too many/i.test(error.message)) return setErro(traduz(error.message));
    setEnviado(true);
  }

  if (enviado)
    return (
      <Alert tone="success" title="Confira seu e-mail">
        Se houver uma conta com {email}, chega um link para entrar. Ele vale por 1 hora.
      </Alert>
    );

  return (
    <form className="flex flex-col gap-4" onSubmit={entrar}>
      {erro && <Alert tone="danger" title={erro} />}
      <Field label="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Field label="Senha" name="senha" type="password" autoComplete="current-password" value={senha} onChange={setSenha} />
      <Button type="submit" loading={busy === "senha"} disabled={!!busy}>
        Entrar
      </Button>
      <Button type="button" variant="secondary" loading={busy === "link"} disabled={!!busy} onClick={linkMagico}>
        Receber link de acesso por e-mail
      </Button>
      <Link href="/esqueci-senha" className="text-sm text-accent underline">
        Esqueci a senha
      </Link>
    </form>
  );
}

export function SignupForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 10) return setErro("Use pelo menos 10 caracteres na senha.");
    setBusy(true);
    setErro(null);
    const { error } = await supabaseBrowser().auth.signUp({
      email: email.trim(),
      password: senha,
      options: { emailRedirectTo: callback("/"), data: { nome: nome.trim() } },
    });
    setBusy(false);
    if (error) return setErro(traduz(error.message));
    setOk(true);
  }

  if (ok)
    return (
      <Alert tone="success" title="Confira seu e-mail">
        Mandamos um link de confirmação para {email}. Depois de confirmar, você entra direto.
      </Alert>
    );

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      {erro && <Alert tone="danger" title={erro} />}
      <TextInput name="nome" label="Seu nome" value={nome} onChange={setNome} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Field label="Senha (mín. 10 caracteres)" name="senha" type="password" autoComplete="new-password" value={senha} onChange={setSenha} />
      <Button type="submit" loading={busy}>
        Criar conta
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: callback("/conta/nova-senha") });
    setBusy(false);
    setOk(true); // mesma resposta exista ou não a conta
  }
  if (ok)
    return (
      <Alert tone="success" title="Confira seu e-mail">
        Se houver uma conta com {email}, chega um link para criar uma senha nova.
      </Alert>
    );
  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Button type="submit" loading={busy}>
        Mandar link
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 10) return setErro("Use pelo menos 10 caracteres.");
    if (senha !== conf) return setErro("As senhas não são iguais.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: senha });
    setBusy(false);
    if (error) return setErro(traduz(error.message));
    router.replace("/conta?senha=ok");
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      {erro && <Alert tone="danger" title={erro} />}
      <Field label="Senha nova" name="senha" type="password" autoComplete="new-password" value={senha} onChange={setSenha} />
      <Field label="Repita a senha" name="conf" type="password" autoComplete="new-password" value={conf} onChange={setConf} />
      <Button type="submit" loading={busy}>
        Salvar senha
      </Button>
    </form>
  );
}

export function CreateOrgForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome para a organização.");
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("create_org", { p_nome: nome.trim() });
    setBusy(false);
    if (error) return setErro(error.code === "P0001" ? error.message : "Não foi possível criar.");
    clearOrgCache();
    router.replace("/");
    router.refresh();
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      {erro && <Alert tone="danger" title={erro} />}
      <TextInput name="org" label="Nome da empresa" value={nome} onChange={setNome} placeholder="Ex.: ProFood Embalagens" />
      <Button type="submit" loading={busy}>
        Criar organização
      </Button>
    </form>
  );
}

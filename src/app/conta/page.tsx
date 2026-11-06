"use client";
import { LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/overlay";
import { Page, TextInput } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast-host";
import { data, usingBackend, type Member } from "@/lib/data";
import { clearOrgCache } from "@/lib/data/supabase";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ContaPage() {
  return (
    <Suspense>
      <Conta />
    </Suspense>
  );
}

function Conta() {
  const [me, setMe] = useState<Member | null>(null);
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  useEffect(() => {
    data.currentUser().then((m) => {
      setMe(m);
      setNome(m.nome);
    });
  }, []);

  async function sair(scope: "local" | "global") {
    setBusy(scope);
    await supabaseBrowser().auth.signOut({ scope });
    clearOrgCache();
    router.replace("/login");
    router.refresh();
  }

  async function salvarNome() {
    setBusy("nome");
    try {
      await data.updateMyName(nome);
      toast({ tone: "success", title: "Nome atualizado" });
    } catch (e) {
      toast({ tone: "danger", title: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setBusy(null);
    }
  }

  async function excluir() {
    setBusy("del");
    setDelErr(null);
    const res = await fetch("/api/conta", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmacao: confirm }) });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setDelErr(body.error ?? "Não foi possível excluir.");
    await supabaseBrowser().auth.signOut({ scope: "local" }).catch(() => {});
    clearOrgCache();
    window.location.href = "/login";
  }

  return (
    <Page title="Minha conta">
      {params.get("senha") === "ok" && <Alert tone="success" title="Senha alterada." />}
      {!usingBackend && (
        <Alert tone="info" title="Modo local">
          Sem login neste ambiente. As opções de conta funcionam com o Supabase ligado.
        </Alert>
      )}
      <section className="flex max-w-lg flex-col gap-4 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="num text-sm text-text-muted [overflow-wrap:anywhere]">{me?.email}</p>
          {me && <Badge tone={me.papel === "admin" ? "accent" : "neutral"}>{me.papel === "admin" ? "Administrador" : "Membro"}</Badge>}
        </div>
        <TextInput name="nome" label="Nome" value={nome} onChange={setNome} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={salvarNome} loading={busy === "nome"} disabled={!me}>
            Salvar nome
          </Button>
          {usingBackend && (
            <Link href="/conta/nova-senha" className="inline-flex h-control-md items-center rounded-md px-4 text-sm font-semibold text-accent hover:bg-accent-soft">
              Trocar senha
            </Link>
          )}
        </div>
      </section>

      {usingBackend && (
        <section className="flex max-w-lg flex-col gap-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-md font-semibold">Sessões</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => sair("local")} loading={busy === "local"}>
              <LogOut size={16} aria-hidden /> Sair
            </Button>
            <Button variant="secondary" onClick={() => sair("global")} loading={busy === "global"}>
              Sair de todos os dispositivos
            </Button>
          </div>
        </section>
      )}

      {usingBackend && (
        <section className="flex max-w-lg flex-col gap-3 rounded-lg border border-danger-soft bg-surface p-5">
          <h2 className="text-md font-semibold">Excluir conta</h2>
          <p className="text-sm text-text-muted">
            Apaga seu acesso e seus dados pessoais. As facas que você criou continuam com a equipe. Se você for o único administrador, passe a administração para alguém antes.
          </p>
          <div>
            <Button variant="danger" onClick={() => setDelOpen(true)}>
              <Trash2 size={16} aria-hidden /> Excluir minha conta
            </Button>
          </div>
        </section>
      )}

      <Dialog open={delOpen} onOpenChange={setDelOpen} title="Excluir conta?" description="Não dá para desfazer. Digite EXCLUIR para confirmar.">
        <div className="flex flex-col gap-4">
          {delErr && <Alert tone="danger" title={delErr} />}
          <TextInput name="confirmacao" label="Confirmação" value={confirm} onChange={setConfirm} placeholder="EXCLUIR" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDelOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={confirm !== "EXCLUIR"} loading={busy === "del"} onClick={excluir}>
              Excluir
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}

"use client";
import { UserMinus, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";
import { Alert, Badge } from "@/components/ui/feedback";
import { DataTable } from "@/components/ui/layout-parts";
import { Dialog } from "@/components/ui/overlay";
import { Page, TextInput } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast-host";
import { data, usingBackend, type Invite, type Member } from "@/lib/data";
import { ConfigNav } from "../config-nav";

const PAPEIS = [
  { value: "member", label: "Membro" },
  { value: "admin", label: "Administrador" },
];

export default function EquipePage() {
  const [me, setMe] = useState<Member | null>(null);
  const [rows, setRows] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState<Member | null>(null);
  const toast = useToast();
  const isAdmin = me?.papel === "admin";

  const load = useCallback(() => {
    setError(false);
    Promise.all([data.listMembers(), data.listInvites()])
      .then(([m, i]) => {
        setRows(m);
        setInvites(i);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    data.currentUser().then(setMe).catch(() => {});
    load();
  }, [load]);

  async function run(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      toast({ tone: "success", title: ok });
      load();
    } catch (e) {
      toast({ tone: "danger", title: e instanceof Error ? e.message : "Não foi possível concluir." });
    }
  }

  return (
    <Page
      title="Configurações"
      description="Quem acessa o gerador. Administradores cuidam dos materiais e da equipe."
      actions={
        isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} aria-hidden /> Convidar
          </Button>
        )
      }
    >
      <ConfigNav />
      {!usingBackend && (
        <Alert tone="info" title="Modo local">
          Sem o Supabase ligado, a equipe e os convites ficam só neste navegador e nenhum e-mail é enviado.
        </Alert>
      )}
      {error ? (
        <Alert tone="danger" title="Não foi possível carregar a equipe">
          <button className="font-semibold underline" onClick={load}>
            Tentar de novo
          </button>
        </Alert>
      ) : (
        <DataTable<Member>
          caption="Equipe"
          loading={rows == null}
          rows={rows ?? []}
          empty="Ninguém na equipe ainda."
          columns={[
            { key: "nome", label: "Nome", render: (m) => <span>{m.nome}{m.id === me?.id && <span className="text-text-muted"> (você)</span>}</span> },
            { key: "email", label: "E-mail", render: (m) => <span className="[overflow-wrap:anywhere]">{m.email}</span> },
            {
              key: "papel",
              label: "Papel",
              render: (m) =>
                isAdmin && m.id !== me?.id ? (
                  <div className="w-44">
                    <Select
                      label={`Papel de ${m.nome}`}
                      hideLabel
                      value={m.papel}
                      onValueChange={(v) => run(() => data.setMemberRole(m.id, v as Member["papel"]), "Papel alterado")}
                      options={PAPEIS}
                    />
                  </div>
                ) : (
                  <Badge tone={m.papel === "admin" ? "accent" : "neutral"}>{m.papel === "admin" ? "Administrador" : "Membro"}</Badge>
                ),
            },
            {
              key: "acoes",
              label: "Ações",
              numeric: true,
              render: (m) =>
                isAdmin && m.id !== me?.id ? (
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Remover ${m.nome}`} title="Remover da equipe" onClick={() => setToRemove(m)}>
                    <UserMinus size={16} aria-hidden />
                  </Button>
                ) : null,
            },
          ]}
        />
      )}

      {invites.length > 0 && (
        <section aria-labelledby="h-convites" className="flex flex-col gap-3">
          <h2 id="h-convites" className="text-md font-semibold">
            Convites pendentes
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{i.email}</span>
                <Badge>{i.papel === "admin" ? "Administrador" : "Membro"}</Badge>
                <span className="num text-xs text-text-subtle">vence {new Date(i.expiresAt).toLocaleDateString("pt-BR")}</span>
                {isAdmin && (
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Cancelar convite de ${i.email}`} title="Cancelar convite" onClick={() => run(() => data.revokeInvite(i.id), "Convite cancelado")}>
                    <X size={16} aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onDone={(email, enviado) => {
          setInviteOpen(false);
          toast({
            tone: "success",
            title: "Convite criado",
            description: enviado ? `E-mail enviado para ${email}.` : `Peça para ${email} criar a conta (ou entrar) com esse e-mail.`,
          });
          load();
        }}
      />

      <Dialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remover da equipe?"
        description={toRemove ? `${toRemove.nome} perde o acesso. As facas criadas por essa pessoa continuam na equipe.` : undefined}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToRemove(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const m = toRemove!;
              setToRemove(null);
              run(() => data.removeMember(m.id), "Pessoa removida");
            }}
          >
            Remover
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: (email: string, enviado: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Member["papel"]>("member");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setEmail("");
      setPapel("member");
      setErro(null);
    }
  }, [open]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro(null);
    try {
      const r = await data.invite(email, papel);
      onDone(email.trim().toLowerCase(), r.emailEnviado);
    } catch (x) {
      setErro(x instanceof Error ? x.message : "Não foi possível convidar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Convidar para a equipe" description="O convite vale por 14 dias.">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {erro && <Alert tone="danger" title={erro} />}
        <TextInput name="email" label="E-mail" value={email} onChange={setEmail} placeholder="nome@empresa.com.br" autoFocus />
        <Select label="Papel" value={papel} onValueChange={(v) => setPapel(v as Member["papel"])} options={PAPEIS} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Convidar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

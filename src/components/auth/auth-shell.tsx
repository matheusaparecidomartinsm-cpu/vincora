import Link from "next/link";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/feedback";
import { BACKEND } from "@/lib/env";

export function AuthShell({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {BACKEND ? (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">{children}</div>
      ) : (
        <Alert tone="info" title="Login desligado neste ambiente">
          Sem as chaves do Supabase o app roda em modo local, com os dados no navegador.{" "}
          <Link href="/" className="font-semibold underline">
            Ir para o gerador
          </Link>
        </Alert>
      )}
      {BACKEND && footer && <div className="flex flex-col gap-2 text-sm text-text-muted">{footer}</div>}
    </main>
  );
}

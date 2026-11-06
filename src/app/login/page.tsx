import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main id="conteudo" className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <Alert tone="info" title="Login ainda não está ligado">
        Esta versão roda sem contas e guarda os dados no navegador. O acesso por e-mail entra junto com o banco de dados.{" "}
        <Link href="/" className="font-semibold underline">
          Ir para o gerador
        </Link>
      </Alert>
    </main>
  );
}

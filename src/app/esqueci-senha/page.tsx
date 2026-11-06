import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Esqueci a senha" };

export default function EsqueciPage() {
  return (
    <AuthShell
      title="Esqueci a senha"
      description="Mandamos um link para você criar uma senha nova."
      footer={
        <Link href="/login" className="text-accent underline">
          Voltar para o login
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}

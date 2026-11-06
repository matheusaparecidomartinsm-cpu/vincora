import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <AuthShell
      title="Criar conta"
      description="Recebeu um convite? Cadastre-se com o mesmo e-mail e você entra direto na equipe."
      footer={
        <p>
          Já tem conta?{" "}
          <Link href="/login" className="text-accent underline">
            Entrar
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}

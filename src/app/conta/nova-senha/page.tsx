import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Senha nova" };

export default function NovaSenhaPage() {
  return (
    <AuthShell title="Senha nova" description="Use pelo menos 10 caracteres.">
      <NewPasswordForm />
    </AuthShell>
  );
}

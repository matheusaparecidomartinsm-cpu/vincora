import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { CreateOrgForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Bem-vindo" };

export default function BemVindoPage() {
  return (
    <AuthShell
      title="Quase lá"
      description="Sua conta ainda não está em nenhuma equipe. Se alguém vai te convidar, peça o convite para este e-mail e entre de novo. Se é o primeiro acesso da empresa, crie a organização: você vira o administrador."
    >
      <CreateOrgForm />
    </AuthShell>
  );
}

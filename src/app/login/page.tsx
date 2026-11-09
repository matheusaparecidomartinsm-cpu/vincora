import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { Mascote } from "@/components/auth/mascote";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="login-dark fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-8 md:flex-row md:gap-16">
        <div className="flex flex-col items-center gap-3">
          <Mascote />
          <p className="login-marca">ProFood</p>
          <p className="login-slogan">Embalando o futuro</p>
        </div>
        <div className="w-full max-w-sm">
          <AuthShell
            dark
            title="Entrar"
            description="Use o e-mail da empresa."
            footer={
              <p>
                Primeira vez?{" "}
                <Link href="/cadastro" className="underline">
                  Criar conta
                </Link>
              </p>
            }
          >
            <Suspense>
              <LoginForm />
            </Suspense>
          </AuthShell>
        </div>
      </div>
    </div>
  );
}

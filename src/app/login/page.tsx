import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import ElectricLogo from "@/components/react-bits/ElectricLogo";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="login-dark fixed inset-0 z-50 overflow-hidden">
      {/* Animação no fundo da tela inteira; no computador o logo fica à esquerda do quadro */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-full md:-left-[30%] md:w-[130%]">
        <ElectricLogo
          src="/logo-profood.png"
          color="#ff3b3b"
          glowColor="#c00000"
          scale={0.48}
          strands={4}
          bend={0.3}
          crackle={0.8}
          arcs={1}
          speed={0.8}
          interactive
        />
      </div>
      <div className="relative z-10 flex h-full items-end justify-center overflow-y-auto md:items-center md:justify-end md:pr-[6%]">
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

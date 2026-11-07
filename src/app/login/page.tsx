import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import ElectricLogo from "@/components/react-bits/ElectricLogo";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] grid-cols-1 md:grid-cols-2">
      <div aria-hidden="true" className="relative h-64 bg-[#0b0613] md:h-auto">
        <ElectricLogo
          src="/logo.svg"
          color="#ecc7ff"
          glowColor="#ad6dff"
          scale={0.7}
          strands={4}
          bend={0.6}
          crackle={1.5}
          arcs={1}
          speed={2.5}
          interactive
        />
      </div>
      <div className="flex items-center justify-center">
      <AuthShell
        title="Entrar"
        description="Use o e-mail da empresa."
        footer={
          <p>
            Primeira vez?{" "}
            <Link href="/cadastro" className="text-accent underline">
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
  );
}

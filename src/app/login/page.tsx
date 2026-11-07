import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import ElectricLogo from "@/components/react-bits/ElectricLogo";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <div aria-hidden="true" style={{ width: "100%", height: "480px", position: "relative" }}>
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
    </>
  );
}

"use client";
import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { DataTable } from "@/components/ui/layout-parts";
import { Page } from "@/components/ui/page";
import { data, type Member } from "@/lib/data";
import { ConfigNav } from "../config-nav";

export default function EquipePage() {
  const [rows, setRows] = useState<Member[] | null>(null);
  useEffect(() => {
    data.listMembers().then(setRows);
  }, []);
  return (
    <Page
      title="Configurações"
      description="Quem acessa o gerador. Administradores cuidam dos materiais e da equipe."
      actions={
        <Button disabled title="Disponível quando o login estiver ligado">
          <UserPlus size={16} aria-hidden /> Convidar
        </Button>
      }
    >
      <ConfigNav />
      <Alert tone="info" title="Convites chegam com o login">
        Por enquanto o app roda sem contas: os dados ficam neste navegador. Com o banco ligado, o convite vai por e-mail.
      </Alert>
      <DataTable<Member>
        caption="Equipe"
        loading={rows == null}
        rows={rows ?? []}
        empty="Ninguém na equipe ainda."
        columns={[
          { key: "nome", label: "Nome", render: (m) => m.nome },
          { key: "email", label: "E-mail", render: (m) => <span className="[overflow-wrap:anywhere]">{m.email}</span> },
          { key: "papel", label: "Papel", render: (m) => <Badge tone={m.papel === "admin" ? "accent" : "neutral"}>{m.papel === "admin" ? "Administrador" : "Membro"}</Badge> },
        ]}
      />
    </Page>
  );
}

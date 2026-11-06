import Link from "next/link";
import { Suspense } from "react";
import { Alert } from "@/components/ui/feedback";
import { CATALOGO, MODELS } from "@/lib/dieline/models";
import { Editor } from "./editor";

export function generateStaticParams() {
  return CATALOGO.map((m) => ({ modelo: m.slug }));
}

export default async function CriarPage({ params }: { params: Promise<{ modelo: string }> }) {
  const { modelo } = await params;
  const def = MODELS[modelo];
  if (!def) {
    const cat = CATALOGO.find((m) => m.slug === modelo);
    return (
      <main id="conteudo" className="mx-auto max-w-content-max px-4 py-8">
        <Alert tone={cat ? "info" : "danger"} title={cat ? `${cat.nome} ainda está em desenvolvimento` : "Modelo não encontrado"}>
          {cat
            ? "O gerador deste modelo entra depois que o anterior for aprovado em protótipo. "
            : "Confira o endereço ou escolha um modelo da lista. "}
          <Link href="/" className="font-semibold underline">
            Ver modelos disponíveis
          </Link>
        </Alert>
      </main>
    );
  }
  return (
    <Suspense>
      <Editor slug={modelo} />
    </Suspense>
  );
}

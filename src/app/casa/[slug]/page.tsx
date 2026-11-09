import { notFound } from "next/navigation";
import { FACAS_CASA, facaCasa } from "@/lib/facas-casa";
import { FacaCasaView } from "./view";

export function generateStaticParams() {
  return FACAS_CASA.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = facaCasa((await params).slug);
  return { title: f?.nome ?? "Faca" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const f = facaCasa((await params).slug);
  if (!f) notFound();
  return <FacaCasaView f={f} />;
}

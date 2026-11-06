import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-content-max px-4 py-16">
      <h1 className="text-xl font-semibold">Gerador de Facas</h1>
      <p className="mt-2 text-text-muted">Em construção. Veja o sistema de design:</p>
      <Link href="/design" className="mt-4 inline-block font-semibold text-accent underline">
        /design
      </Link>
    </main>
  );
}

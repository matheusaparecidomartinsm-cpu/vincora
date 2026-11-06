"use client";
import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ConfigNav() {
  const path = usePathname();
  const items = [
    { href: "/config/materiais", label: "Materiais" },
    { href: "/config/equipe", label: "Equipe" },
  ];
  return (
    <nav aria-label="Configurações" className="flex border-b border-border">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={path === it.href ? "page" : undefined}
          className={clsx(
            "-mb-px flex h-control-md items-center border-b-2 px-4 text-sm font-medium",
            path === it.href ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

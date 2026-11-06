"use client";
import * as RDialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export function MobileNav({ items, current }: { items: { k: string; href: string; label: string }[]; current: string | null }) {
  return (
    <RDialog.Root>
      <RDialog.Trigger
        aria-label="Abrir menu"
        className="ml-auto grid h-control-md w-control-md place-items-center rounded-md text-text-muted hover:bg-surface-sunken md:hidden"
      >
        <Menu size={20} aria-hidden />
      </RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-text/40" />
        <RDialog.Content className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col gap-2 bg-surface p-4 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <RDialog.Title className="text-md font-semibold">Menu</RDialog.Title>
            <RDialog.Close aria-label="Fechar menu" className="rounded-md p-2 text-text-muted hover:bg-surface-sunken">
              <X size={18} aria-hidden />
            </RDialog.Close>
          </div>
          <RDialog.Description className="sr-only">Navegação principal</RDialog.Description>
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {items.map((it) => (
              <RDialog.Close asChild key={it.k}>
                <Link
                  href={it.href}
                  aria-current={current === it.k ? "page" : undefined}
                  className={clsx(
                    "flex h-control-lg items-center rounded-md px-3 text-md",
                    current === it.k ? "bg-accent-soft font-medium text-on-accent-soft" : "text-text hover:bg-surface-sunken",
                  )}
                >
                  {it.label}
                </Link>
              </RDialog.Close>
            ))}
          </nav>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

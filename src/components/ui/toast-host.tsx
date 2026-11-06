"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast, ToastProvider, ToastViewport } from "./overlay";

type ToastMsg = { id: number; tone: "success" | "danger"; title: string; description?: string; action?: { label: string; onClick: () => void } };
const Ctx = createContext<(t: Omit<ToastMsg, "id">) => void>(() => {});

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const show = useCallback((t: Omit<ToastMsg, "id">) => setItems((xs) => [...xs, { ...t, id: Date.now() + Math.random() }]), []);
  return (
    <ToastProvider swipeDirection="right" label="Notificação">
      <Ctx.Provider value={show}>{children}</Ctx.Provider>
      {items.map((t) => (
        <Toast
          key={t.id}
          open
          onOpenChange={(o) => !o && setItems((xs) => xs.filter((x) => x.id !== t.id))}
          tone={t.tone}
          title={t.title}
          description={t.description}
          action={t.action}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export const useToast = () => useContext(Ctx);

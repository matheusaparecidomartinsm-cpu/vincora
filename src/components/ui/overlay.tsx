"use client";
import * as RDialog from "@radix-ui/react-dialog";
import * as RToast from "@radix-ui/react-toast";
import { clsx } from "clsx";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Dialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>}
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-text/40" />
        <RDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(var(--l-dialog-w),calc(100vw-var(--l-gutter)))] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-6 shadow-lg">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <RDialog.Title className="text-lg font-semibold text-text">{title}</RDialog.Title>
              {description && <RDialog.Description className="text-sm text-text-muted">{description}</RDialog.Description>}
            </div>
            <RDialog.Close aria-label="Fechar" className="rounded-md p-1 text-text-muted hover:bg-surface-sunken">
              <X aria-hidden size={18} />
            </RDialog.Close>
          </div>
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export const ToastProvider = RToast.Provider;
export const ToastViewport = () => (
  <RToast.Viewport className="fixed right-4 top-[calc(var(--l-header-h)+var(--spacing)*4)] z-50 flex w-toast-w max-w-[calc(100vw-var(--l-gutter))] flex-col gap-2" />
);

export function Toast({
  tone = "success",
  title,
  description,
  action,
  open,
  onOpenChange,
}: {
  tone?: "success" | "danger";
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <RToast.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={5000}
      className={clsx(
        "flex items-start gap-3 rounded-md border border-border border-l-[3px] bg-surface p-4 shadow-lg",
        tone === "success" ? "border-l-success" : "border-l-danger",
      )}
    >
      <div className="flex flex-1 flex-col gap-1">
        <RToast.Title className="text-sm font-semibold text-text">{title}</RToast.Title>
        {description && <RToast.Description className="text-sm text-text-muted">{description}</RToast.Description>}
      </div>
      {action && (
        <RToast.Action altText={action.label} asChild>
          <button onClick={action.onClick} className="text-sm font-semibold text-accent hover:underline">
            {action.label}
          </button>
        </RToast.Action>
      )}
      <RToast.Close aria-label="Fechar" className="text-text-muted">
        <X aria-hidden size={16} />
      </RToast.Close>
    </RToast.Root>
  );
}

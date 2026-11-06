import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

const soft: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-text-muted",
  accent: "bg-accent-soft text-on-accent-soft",
  info: "bg-accent-soft text-on-accent-soft",
  success: "bg-success-soft text-on-success-soft",
  warning: "bg-warning-soft text-on-warning-soft",
  danger: "bg-danger-soft text-on-danger-soft",
};
const icons = { info: Info, accent: Info, neutral: Info, success: CheckCircle2, warning: AlertTriangle, danger: OctagonAlert };

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex h-5 items-center rounded-sm px-2 text-xs font-medium", soft[tone])}>
      {children}
    </span>
  );
}

/** Aviso de regra do modelo (info / warning / error). */
export function RuleNotice({ tone = "info", children }: { tone?: "info" | "warning" | "danger"; children: ReactNode }) {
  const Icon = icons[tone];
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={clsx("flex gap-2 rounded-md p-3 text-sm", soft[tone])}>
      <Icon aria-hidden size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  children?: ReactNode;
}) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx("flex gap-3 rounded-md p-4", soft[tone])}
    >
      <Icon aria-hidden size={20} className="shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="text-sm">{children}</div>}
      </div>
    </div>
  );
}

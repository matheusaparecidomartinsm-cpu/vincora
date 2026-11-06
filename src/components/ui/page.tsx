import type { ReactNode } from "react";

/** Moldura padrão de página: título, descrição opcional, ações à direita. */
export function Page({ title, description, actions, children, wide }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <main id="conteudo" className={`mx-auto flex flex-col gap-6 px-4 py-8 ${wide ? "max-w-editor-max" : "max-w-content-max"}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-text">{title}</h1>
          {description && <p className="max-w-[70ch] text-md text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </main>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  mono,
  error,
  autoFocus,
  maxLength = 80,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  error?: string;
  autoFocus?: boolean;
  maxLength?: number;
  name?: string;
}) {
  const id = `f-${name ?? label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        autoFocus={autoFocus}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`h-control-md rounded-md border bg-surface px-3 text-md text-text placeholder:text-text-subtle ${error ? "border-danger" : "border-border-input"} ${mono ? "num" : ""}`}
      />
      {error && (
        <p id={`${id}-err`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

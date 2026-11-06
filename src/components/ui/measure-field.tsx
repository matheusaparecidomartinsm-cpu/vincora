"use client";
import { clsx } from "clsx";
import { useId, useState, type KeyboardEvent } from "react";

/** Converte "70,5" / "70.5" em número; vazio ou inválido = null. */
export function parseMm(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatMm(n: number, decimals = 1): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: decimals });
}

type Props = {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  help?: string;
  error?: string;
  decimals?: number;
  disabled?: boolean;
  unit?: string;
};

export function MeasureField({ label, value, onChange, help, error, decimals = 1, disabled, unit = "mm" }: Props) {
  const id = useId();
  const [text, setText] = useState(value == null ? "" : formatMm(value, decimals));
  const describedBy = [help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;

  function commit(next: string) {
    setText(next);
    onChange(parseMm(next));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    const base = parseMm(text) ?? 0;
    const next = Math.max(0, Math.round((base + (e.key === "ArrowUp" ? step : -step)) * 1000) / 1000);
    commit(formatMm(next, decimals));
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label} <span className="sr-only">em {unit === "mm" ? "milímetros" : unit}</span>
      </label>
      <div
        className={clsx(
          "flex h-control-md items-center rounded-md border bg-surface px-3",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
          error ? "border-danger" : "border-border-input",
          disabled && "opacity-50",
        )}
      >
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={text}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          className="num w-full min-w-0 bg-transparent text-md text-text outline-none placeholder:text-text-subtle"
          placeholder="0"
        />
        <span aria-hidden className="num pl-2 text-sm text-text-subtle">
          {unit}
        </span>
      </div>
      {help && !error && (
        <p id={`${id}-help`} className="text-xs text-text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

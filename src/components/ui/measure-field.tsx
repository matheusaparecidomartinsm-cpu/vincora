"use client";
import { clsx } from "clsx";
import { useEffect, useId, useState, type ClipboardEvent, type KeyboardEvent } from "react";

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
  /** colar "70x150x40" chama isto com os três números */
  onPasteTriple?: (v: [number, number, number]) => void;
  id?: string;
};

export function MeasureField({ label, value, onChange, help, error, decimals = 1, disabled, unit = "mm", onPasteTriple, id: idProp }: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [text, setText] = useState(value == null ? "" : formatMm(value, decimals));

  // sincroniza quando o valor muda por fora (ex.: abrir faca salva, trocar material)
  useEffect(() => {
    setText((cur) => (parseMm(cur) === value ? cur : value == null ? "" : formatMm(value, decimals)));
  }, [value, decimals]);

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    if (!onPasteTriple) return;
    const m = e.clipboardData.getData("text").match(/^\s*([\d.,]+)\s*[x×*X]\s*([\d.,]+)\s*[x×*X]\s*([\d.,]+)\s*$/);
    if (!m) return;
    const nums = m.slice(1, 4).map(parseMm);
    if (nums.some((v) => v == null)) return;
    e.preventDefault();
    onPasteTriple(nums as [number, number, number]);
  }
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
          error ? "border-danger" : disabled ? "border-border bg-surface-sunken" : "border-border-input",
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
          onPaste={onPaste}
          className={clsx("num w-full min-w-0 bg-transparent text-md outline-none placeholder:text-text-subtle", disabled ? "text-text-muted" : "text-text")}
          placeholder="0"
        />
        <span aria-hidden className={clsx("num pl-2 text-sm", disabled ? "text-text-muted" : "text-text-subtle")}>
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

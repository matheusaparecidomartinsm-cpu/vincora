"use client";
import * as RSelect from "@radix-ui/react-select";
import * as RSwitch from "@radix-ui/react-switch";
import * as RTabs from "@radix-ui/react-tabs";
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";

/* Switch ------------------------------------------------------------------ */
export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        {description && (
          <span id={`${id}-d`} className="text-xs text-text-muted">
            {description}
          </span>
        )}
      </div>
      <RSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-d` : undefined}
        className={clsx(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-[var(--m-fast)]",
          "bg-border-input data-[state=checked]:bg-accent disabled:opacity-50",
        )}
      >
        <RSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-surface shadow-sm transition-transform duration-[var(--m-fast)] data-[state=checked]:translate-x-[18px]" />
      </RSwitch.Root>
    </div>
  );
}

/* Select ------------------------------------------------------------------ */
export type Option = { value: string; label: string; hint?: string };

export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Selecione",
  emptyText,
  hideLabel,
}: {
  hideLabel?: boolean;
  label: string;
  value?: string;
  onValueChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  emptyText?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-text"}>
        {label}
      </label>
      {options.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong p-3 text-sm text-text-muted">{emptyText}</div>
      ) : (
        <RSelect.Root value={value} onValueChange={onValueChange}>
          <RSelect.Trigger
            id={id}
            className="flex h-control-md items-center justify-between rounded-md border border-border-input bg-surface px-3 text-md text-text data-[placeholder]:text-text-subtle"
          >
            <RSelect.Value placeholder={placeholder} />
            <RSelect.Icon>
              <ChevronDown aria-hidden size={16} className="text-text-muted" />
            </RSelect.Icon>
          </RSelect.Trigger>
          <RSelect.Portal>
            <RSelect.Content
              position="popper"
              sideOffset={4}
              className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface shadow-lg"
            >
              <RSelect.Viewport className="p-1">
                {options.map((o) => (
                  <RSelect.Item
                    key={o.value}
                    value={o.value}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-sm px-3 py-2 text-sm text-text outline-none data-[highlighted]:bg-accent-soft"
                  >
                    <RSelect.ItemText>{o.label}</RSelect.ItemText>
                    <span className="flex items-center gap-2">
                      {o.hint && <span className="num text-xs text-text-subtle">{o.hint}</span>}
                      <RSelect.ItemIndicator>
                        <Check aria-hidden size={14} className="text-accent" />
                      </RSelect.ItemIndicator>
                    </span>
                  </RSelect.Item>
                ))}
              </RSelect.Viewport>
            </RSelect.Content>
          </RSelect.Portal>
        </RSelect.Root>
      )}
    </div>
  );
}

/* Chips de categoria (toggle buttons) -------------------------------------- */
export function CategoryChips({
  items,
  active,
  onChange,
  label,
}: {
  items: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.value)}
            className={clsx(
              "h-control-sm rounded-full border px-3 text-sm transition-colors duration-[var(--m-fast)]",
              on
                ? "border-transparent bg-accent-soft font-medium text-on-accent-soft"
                : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* Abas 2D / 3D ---------------------------------------------------------------- */
export function ViewTabs({ tabs, fill }: { tabs: { value: string; label: string; content: ReactNode }[]; fill?: boolean }) {
  return (
    <RTabs.Root defaultValue={tabs[0].value} className={clsx("flex flex-col", fill && "h-full")}>
      <RTabs.List aria-label="Visualização" className="flex border-b border-border">
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className="-mb-px h-control-md border-b-2 border-transparent px-4 text-sm font-medium text-text-muted data-[state=active]:border-accent data-[state=active]:text-accent"
          >
            {t.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value} className={clsx(fill ? "min-h-0 flex-1 pt-3 data-[state=inactive]:hidden" : "pt-4")}>
          {t.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}

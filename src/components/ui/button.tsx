import { clsx } from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active",
  secondary: "bg-surface text-text border border-border-strong hover:bg-surface-sunken",
  ghost: "bg-transparent text-accent hover:bg-accent-soft",
  danger: "bg-danger text-on-danger hover:bg-danger-hover",
};
const sizes: Record<Size, string> = {
  sm: "h-control-sm px-3 text-xs",
  md: "h-control-md px-4 text-sm",
  lg: "h-control-lg px-5 text-md",
};
const iconSizes: Record<Size, string> = {
  sm: "h-control-sm w-control-sm",
  md: "h-control-md w-control-md",
  lg: "h-control-lg w-control-lg",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconOnly?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, iconOnly, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 rounded-md font-semibold",
        "transition-colors duration-[var(--m-fast)] ease-[var(--m-ease)]",
        loading ? "cursor-progress" : "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        iconOnly ? iconSizes[size] : sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="absolute inset-0 m-auto h-4 w-4 rounded-full border-2 border-current border-r-transparent [animation:spin_0.7s_linear_infinite]"
        />
      )}
      <span className={clsx("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
    </button>
  );
});

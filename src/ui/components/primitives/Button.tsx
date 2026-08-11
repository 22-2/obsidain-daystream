import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "src/ui/components/primitives/utils";

// Button: Tailwind ベースのシンプルなボタンコンポーネント。
// 目的: 既存 Chakra Button の代替として見た目を整えつつ、Props の互換を保つ。
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "default" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { variant = "default", size = "md", className, children, disabled, ...rest } = props;

  const base =
    "cursor-pointer disabled:cursor-not-allowed disabled:bg-[var(--interactive-normal)] disabled:text-[var(--text-color)]";
  const variants: Record<string, string> = {
    default: "",
    ghost:
      "bg-[var(--interactive-normal)] text-[var(--text-color)] hover:bg-[var(--interactive-hover)]",
    accent:
      "bg-[var(--interactive-accent)] text-[var(--text-on-accent)] hover:bg-[var(--interactive-accent-hover)]",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const classes = cn(
    base,
    variants[variant as string] ?? variants.default,
    sizes[size] ?? sizes.md,
    className,
  );

  return (
    <button ref={ref} type="button" className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
});

Button.displayName = "Button";

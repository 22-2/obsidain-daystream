import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

// Tag: Chakra互換のラベル/バッジ。size/variant/colorScheme/borderRadiusをサポート。
type TagProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "md" | "lg";
  variant?: "subtle" | "solid" | "outline";
  colorScheme?: string;
  borderRadius?: string;
  className?: string;
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>((props, ref) => {
  const {
    size = "md",
    variant = "subtle",
    colorScheme = "gray",
    borderRadius = "0.375rem",
    className,
    children,
    ...rest
  } = props;
  // Chakra風の色・variantを最低限再現
  const base = "inline-flex items-center font-medium";
  const sizes: Record<string, string> = {
    sm: "text-xs px-2 py-0.5 h-5 min-h-[1.25rem]",
    md: "text-sm px-2.5 py-0.5 h-6 min-h-[1.5rem]",
    lg: "text-base px-3 py-1 h-8 min-h-[2rem]",
  };
  const variants: Record<string, string> = {
    subtle: `bg-[var(--tag-bg,theme(colors.gray.100))] text-[var(--tag-fg,theme(colors.gray.800))]`,
    solid: `bg-[var(--tag-solid-bg,theme(colors.gray.700))] text-white`,
    outline: `border border-[var(--tag-outline,theme(colors.gray.400))] text-[var(--tag-fg,theme(colors.gray.800))]`,
  };
  // borderRadiusはstyleで直接指定
  const classes = cn(
    base,
    sizes[size] ?? sizes.md,
    variants[variant] ?? variants.subtle,
    className,
  );
  return (
    <span ref={ref} className={classes} style={{ borderRadius }} {...rest}>
      {children}
    </span>
  );
});

Tag.displayName = "Tag";

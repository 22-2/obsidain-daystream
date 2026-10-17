import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

// Tag: Chakra互換のラベル/バッジ。size/variant/borderRadiusをサポート。
type TagProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "md" | "lg";
  variant?: "subtle" | "solid" | "outline";
  borderRadius?: string;
  className?: string;
};

const sizeClassMap: Record<"sm" | "md" | "lg", string> = {
  sm: "text-xs px-2 py-0.5 h-5 min-h-[1.25rem]",
  md: "text-sm px-2.5 py-0.5 h-6 min-h-[1.5rem]",
  lg: "text-base px-3 py-1 h-8 min-h-[2rem]",
};

const variantClassMap: Record<"subtle" | "solid" | "outline", string> = {
  subtle: "bg-[var(--tag-bg,theme(colors.gray.100))] text-[var(--tag-fg,theme(colors.gray.800))]",
  solid: "bg-[var(--tag-solid-bg,theme(colors.gray.700))] text-white",
  outline: "border border-[var(--tag-outline,theme(colors.gray.400))] text-[var(--tag-fg,theme(colors.gray.800))]",
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>((props, ref) => {
  const { size = "md", variant = "subtle", borderRadius = "0.375rem", className, children, ...rest } = props;
  // Chakra風の色・variantを最低限再現
  const base = "inline-flex items-center font-medium";
  // borderRadiusはstyleで直接指定
  const classes = cn(base, sizeClassMap[size], variantClassMap[variant], className);
  return (
    <span ref={ref} className={classes} style={{ borderRadius }} {...rest}>
      {children}
    </span>
  );
});

Tag.displayName = "Tag";

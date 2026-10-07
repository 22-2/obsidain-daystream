import type { ComponentPropsWithRef, ElementType, ReactNode, Ref } from "react";
import { createElement, forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

// HStack: 横並びのスタック（Tailwind クラスで表現）。埋め込み style を使わない。
type HStackProps<T extends ElementType = "div"> = {
  as?: T;
  gap?: string | number;
  align?: "center" | "start" | "end" | string;
  justify?: "center" | "start" | "end" | "between" | string;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<T>, "className" | "style" | "as">;

function HStackInner<T extends ElementType = "div">(
  { as, gap = "0.5rem", align = "center", justify, className, children, ...rest }: HStackProps<T>,
  ref: Ref<unknown>,
) {
  const Comp = as ?? "div";

  const gapClass = typeof gap === "number" ? `gap-[${gap}px]` : `gap-[${String(gap)}]`;
  const alignMap: Record<string, string> = {
    center: "items-center",
    start: "items-start",
    end: "items-end",
  };
  const justifyMap: Record<string, string> = {
    center: "justify-center",
    start: "justify-start",
    end: "justify-end",
    between: "justify-between",
  };

  const classes = cn(
    "flex flex-row",
    gapClass,
    alignMap[align] ?? "",
    justifyMap[justify ?? ""] ?? "",
    className,
  );

  return createElement(Comp, { ref, className: classes, ...rest }, children);
}

export const HStack = forwardRef(HStackInner) as <T extends ElementType = "div">(
  props: HStackProps<T> & { ref?: Ref<unknown> },
) => ReactNode;

Object.defineProperty(HStack, "displayName", { value: "HStack" });

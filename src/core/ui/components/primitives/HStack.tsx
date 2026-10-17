import type { ComponentPropsWithRef, ElementType, ReactNode, Ref } from "react";
import { createElement, forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type HStackAlign = "center" | "start" | "end";
type HStackJustify = "center" | "start" | "end" | "between";

// HStack: 横並びのスタック（Tailwind クラスで表現）。埋め込み style を使わない。
type HStackProps<T extends ElementType = "div"> = {
  as?: T;
  gap?: string | number;
  align?: HStackAlign;
  justify?: HStackJustify;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<T>, "className" | "style" | "as">;

const alignClassMap: Record<HStackAlign, string> = {
  center: "items-center",
  start: "items-start",
  end: "items-end",
};

const justifyClassMap: Record<HStackJustify, string> = {
  center: "justify-center",
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
};

function HStackInner<T extends ElementType = "div">(
  { as, gap = "0.5rem", align = "center", justify, className, children, ...rest }: HStackProps<T>,
  ref: Ref<unknown>,
) {
  const Comp: ElementType = as ?? "div";
  const gapClass = typeof gap === "number" ? "gap-[" + gap + "px]" : "gap-[" + gap + "]";

  const classes = cn(
    "flex flex-row",
    gapClass,
    alignClassMap[align],
    justify === undefined ? "" : justifyClassMap[justify],
    className,
  );

  return createElement(Comp, { ...rest, ref, className: classes }, children);
}

export const HStack = forwardRef(HStackInner) as <T extends ElementType = "div">(
  props: HStackProps<T> & { ref?: Ref<unknown> },
) => ReactNode;

Object.defineProperty(HStack, "displayName", { value: "HStack" });

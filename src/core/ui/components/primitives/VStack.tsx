import type { ComponentPropsWithRef, ElementType } from "react";
import { createElement, forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type VStackAlign = "center" | "start" | "end" | "stretch";
type VStackJustify = "center" | "start" | "end" | "between";

// VStack: 縦並びのスタック。Chakra互換APIでgap/align/justifyをサポート。
type VStackProps<T extends ElementType = "div"> = {
  as?: T;
  gap?: string | number;
  align?: VStackAlign;
  justify?: VStackJustify;
  className?: string;
} & Omit<ComponentPropsWithRef<T>, "className" | "style">;

const alignClassMap: Record<VStackAlign, string> = {
  center: "items-center",
  start: "items-start",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyClassMap: Record<VStackJustify, string> = {
  center: "justify-center",
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
};

export const VStack = forwardRef<HTMLElement, VStackProps>((props, ref) => {
  const { as: Comp = "div", gap = "0.5rem", align = "center", justify, className, children, ...rest } = props;
  const gapClass = typeof gap === "number" ? "gap-[" + gap + "px]" : "gap-[" + gap + "]";

  const classes = cn(
    "flex flex-col",
    gapClass,
    alignClassMap[align],
    justify === undefined ? "" : justifyClassMap[justify],
    className,
  );

  return createElement(Comp, { ...rest, ref, className: classes }, children);
});

VStack.displayName = "VStack";

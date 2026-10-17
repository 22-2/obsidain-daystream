import type { ComponentPropsWithRef, ElementType } from "react";
import { createElement, forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
type FlexAlign = "center" | "start" | "end" | "stretch" | "baseline";
type FlexJustify = "center" | "start" | "end" | "between" | "around" | "evenly";

// Flex: Tailwind クラスで表現する flex ラッパー。埋め込み style を使わない。
type FlexProps<T extends ElementType = "div"> = {
  as?: T;
  direction?: FlexDirection;
  align?: FlexAlign;
  justify?: FlexJustify;
  gap?: string | number;
  className?: string;
} & Omit<ComponentPropsWithRef<T>, "className" | "style">;

const directionClassMap: Record<FlexDirection, string> = {
  row: "flex-row",
  column: "flex-col",
  "row-reverse": "flex-row-reverse",
  "column-reverse": "flex-col-reverse",
};

const alignClassMap: Record<FlexAlign, string> = {
  center: "items-center",
  start: "items-start",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClassMap: Record<FlexJustify, string> = {
  center: "justify-center",
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

function gapToClass(gap: string | number | undefined): string {
  if (gap === undefined) return "";
  return typeof gap === "number" ? "gap-[" + gap + "px]" : "gap-[" + gap + "]";
}

export const Flex = forwardRef<HTMLElement, FlexProps>((props, ref) => {
  const { as: Comp = "div", direction, align, justify, gap, className, children, ...rest } = props;

  const classes = cn(
    "flex",
    direction === undefined ? "" : directionClassMap[direction],
    align === undefined ? "" : alignClassMap[align],
    justify === undefined ? "" : justifyClassMap[justify],
    gapToClass(gap),
    className,
  );

  return createElement(Comp, { ...rest, ref, className: classes }, children);
});

Flex.displayName = "Flex";

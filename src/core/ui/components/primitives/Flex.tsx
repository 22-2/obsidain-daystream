import type { ComponentPropsWithRef, ElementType } from "react";
import React, { forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

// Flex: Tailwind クラスで表現する flex ラッパー。埋め込み style を使わない。
type FlexProps<T extends ElementType = "div"> = {
  as?: T;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  align?: "center" | "start" | "end" | "stretch" | "baseline" | string;
  justify?: "center" | "start" | "end" | "between" | "around" | "evenly" | string;
  gap?: string | number;
  className?: string;
} & Omit<ComponentPropsWithRef<T>, "className" | "style">;

export const Flex = forwardRef<HTMLElement, FlexProps>((props, ref) => {
  const {
    as: Comp = "div",
    direction,
    align,
    justify,
    gap,
    className,
    children,
    ...rest
  } = props as any;

  const dirClass =
    direction === "row"
      ? "flex-row"
      : direction === "column"
        ? "flex-col"
        : direction === "row-reverse"
          ? "flex-row-reverse"
          : direction === "column-reverse"
            ? "flex-col-reverse"
            : "";

  const alignMap: Record<string, string> = {
    center: "items-center",
    start: "items-start",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  };

  const justifyMap: Record<string, string> = {
    center: "justify-center",
    start: "justify-start",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
  };

  const gapClass =
    gap === undefined ? "" : typeof gap === "number" ? `gap-[${gap}px]` : `gap-[${String(gap)}]`;

  const classes = cn(
    "flex",
    dirClass,
    alignMap[align] ?? "",
    justifyMap[justify] ?? "",
    gapClass,
    className,
  );

  return React.createElement(Comp as any, { ref, className: classes, ...rest }, children);
});

Flex.displayName = "Flex";

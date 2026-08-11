import type { ComponentPropsWithRef, ElementType } from "react";
import React, { forwardRef } from "react";
import { cn } from "src/ui/components/primitives/utils";

// VStack: 縦並びのスタック。Chakra互換APIでgap/align/justifyをサポート。
type VStackProps<T extends ElementType = "div"> = {
  as?: T;
  gap?: string | number;
  align?: "center" | "start" | "end" | "stretch" | string;
  justify?: "center" | "start" | "end" | "between" | string;
  className?: string;
} & Omit<ComponentPropsWithRef<T>, "className" | "style">;

export const VStack = forwardRef<HTMLElement, VStackProps>((props, ref) => {
  const {
    as: Comp = "div",
    gap = "0.5rem",
    align = "center",
    justify,
    className,
    children,
    ...rest
  } = props as any;
  const gapClass = typeof gap === "number" ? `gap-[${gap}px]` : `gap-[${String(gap)}]`;
  const alignMap: Record<string, string> = {
    center: "items-center",
    start: "items-start",
    end: "items-end",
    stretch: "items-stretch",
  };
  const justifyMap: Record<string, string> = {
    center: "justify-center",
    start: "justify-start",
    end: "justify-end",
    between: "justify-between",
  };
  const classes = cn(
    "flex flex-col",
    gapClass,
    alignMap[align] ?? "",
    justifyMap[justify] ?? "",
    className,
  );

  return React.createElement(Comp, { ref, className: classes, ...rest }, children);
});

VStack.displayName = "VStack";

import type { ElementType, HTMLAttributes } from "react";
import { createElement } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  className?: string;
};

export const Text = ({ as: Comp = "span", className, children, ...rest }: TextProps) => {
  return createElement(Comp, { ...rest, className: cn(className) }, children);
};

Text.displayName = "Text";

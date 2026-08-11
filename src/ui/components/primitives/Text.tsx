import React from "react";
import { cn } from "src/ui/components/primitives/utils";

type TextProps = React.HTMLAttributes<HTMLElement> & {
  as?: any;
  className?: string;
};

export const Text = ({ as: Comp = "span", className, children, ...rest }: TextProps) => {
  return React.createElement(Comp as any, { className: cn(className), ...rest }, children);
};

Text.displayName = "Text";

import React from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
};

export const Heading = ({ as: Comp = "h3", className, children, ...rest }: HeadingProps) =>
  React.createElement(Comp as any, { className: cn(className), ...rest }, children);

Heading.displayName = "Heading";

import type { HTMLAttributes } from "react";
import { createElement } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: HeadingLevel;
  className?: string;
};

export const Heading = ({ as: Comp = "h3", className, children, ...rest }: HeadingProps) =>
  createElement(Comp, { ...rest, className: cn(className) }, children);

Heading.displayName = "Heading";

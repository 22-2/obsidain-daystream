import React from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  className?: string;
};

export const Link = ({ className, ...rest }: LinkProps) => (
  <a className={cn(className)} {...rest} />
);

Link.displayName = "Link";

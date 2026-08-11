import React from "react";
import { cn } from "src/ui/components/primitives/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  className?: string;
};

const Badge = ({ className, children, ...rest }: BadgeProps) => (
  <span
    className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md", className)}
    {...rest}
  >
    {children}
  </span>
);

Badge.displayName = "Badge";

import React from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type SpacerProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

const Spacer = ({ className, ...rest }: SpacerProps) => (
  <div className={cn("flex-1", className)} {...rest} />
);

Spacer.displayName = "Spacer";

import React from "react";
import { cn } from "src/ui/components/primitives/utils";

type GridProps = React.HTMLAttributes<HTMLDivElement> & {
  cols?: number;
  gap?: string | number;
  className?: string;
};

const Grid = ({ cols = 2, gap = "0.5rem", className, children, ...rest }: GridProps) => {
  const gapClass = typeof gap === "number" ? `gap-[${gap}px]` : `gap-[${String(gap)}]`;
  const colsClass = `grid-cols-${cols}`;
  return (
    <div className={cn("grid", colsClass, gapClass, className)} {...rest}>
      {children}
    </div>
  );
};

Grid.displayName = "Grid";

import React from "react";
import { cn } from "src/core/ui/components/primitives/utils";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export const Checkbox = ({ className, ...rest }: CheckboxProps) => (
  <input type="checkbox" className={cn(className)} {...rest} />
);

Checkbox.displayName = "Checkbox";

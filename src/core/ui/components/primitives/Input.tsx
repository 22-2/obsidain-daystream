import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "src/core/ui/components/primitives/utils";

// Input: Tailwind ベースのシンプルな input コンポーネント。
type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { className, ...rest } = props;
  const classes = cn(
    "block w-full rounded-md border py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1",
    className,
  );

  return <input ref={ref} className={classes} {...rest} />;
});

Input.displayName = "Input";

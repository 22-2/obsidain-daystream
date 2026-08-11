import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import type { BoxProps } from "src/ui/components/primitives/Box";
import { cn } from "src/ui/components/primitives/utils";

function Spinner({ className, ...props }: BoxProps) {
  return <ObsidianIcon name="loader" className={cn("size-4 animate-spin", className)} {...props} />;
}

export { Spinner };

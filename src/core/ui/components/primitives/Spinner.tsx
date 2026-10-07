import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import type { BoxProps } from "src/core/ui/components/primitives/Box";
import { cn } from "src/core/ui/components/primitives/utils";

function Spinner({ className, ...props }: BoxProps) {
  return <ObsidianIcon name="loader" className={cn("size-4 animate-spin", className)} {...props} />;
}

export { Spinner };

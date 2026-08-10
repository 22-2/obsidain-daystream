import type { FC } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { HStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

export const NavButton: FC<{
  direction: "left" | "right";
  onClick: () => void;
  className?: string;
}> = ({ direction, onClick, className }) => {
  return (
    <HStack
      className={cn(
        `mfdi-nav-button mfdi-nav-button-${direction} cursor-pointer ${direction === "left" ? "flex-row" : "flex-row-reverse"} gap-0`,
        className,
      )}
      onClick={onClick}
    >
      <ObsidianIcon name={`chevron-${direction}`} boxSize="1em" />
    </HStack>
  );
};

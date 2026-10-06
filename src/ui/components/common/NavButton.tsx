import { type FC } from "react";
import { IconButton } from "src/ui/components/common/IconButton";
import { cn } from "src/ui/components/primitives/utils";

export const NavButton: FC<{
  direction: "left" | "right";
  onClick: () => void;
  className?: string;
}> = ({ direction, onClick, className }) => {
  return (
    <IconButton
      name={`chevron-${direction}`}
      tooltip={direction === "left" ? "前へ" : "次へ"}
      onActivate={onClick}
      className={cn(`mfdi-nav-button mfdi-nav-button-${direction} size-6 p-1`, className)}
    />
  );
};

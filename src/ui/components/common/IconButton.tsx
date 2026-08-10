import type { KeyboardEvent, MouseEventHandler } from "react";
import React, { memo, useCallback } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { cn } from "src/ui/components/primitives/utils";

type IconButtonProps = {
  name: string;
  ariaLabel: string;
  title?: string;
  onActivate?: () => void;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  isDisabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export const IconButton = memo(
  ({
    name,
    ariaLabel,
    title,
    onActivate,
    onContextMenu,
    isDisabled = false,
    className,
    size = "sm",
  }: IconButtonProps) => {
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (isDisabled || !onActivate) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onActivate();
      },
      [isDisabled, onActivate],
    );

    return (
      <ObsidianIcon
        name={name}
        size={size === "sm" ? "1.25em" : "1.7em"}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={cn(
          "h-[1.7em] w-[1.7em] rounded-[var(--corner-shape)] hover:bg-[var(--interactive-hover)]",
          className,
        )}
        onClick={isDisabled ? undefined : onActivate}
        onKeyDown={handleKeyDown}
        onContextMenu={onContextMenu}
      />
    );
  },
);

IconButton.displayName = "IconButton";

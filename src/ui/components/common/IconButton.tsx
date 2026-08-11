import type { KeyboardEvent, MouseEventHandler } from "react";
import React, { memo, useCallback } from "react";
import type { IconSize } from "src/ui/components/common/icon-size";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { cn } from "src/ui/components/primitives/utils";

export type IconButtonProps = {
  name: string;
  ariaLabel: string;
  title?: string;
  onActivate?: () => void;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  isDisabled?: boolean;
  /** 数値は px、文字列は CSS の長さとしてアイコンに渡す。 */
  size?: IconSize;
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
    size = "1.25em",
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
        size={size}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={cn(
          "h-[1.7em] w-[1.7em] rounded-[var(--corner-shape)] p-0 hover:bg-[var(--interactive-hover)]",
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

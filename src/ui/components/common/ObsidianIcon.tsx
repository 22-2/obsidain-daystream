import { setIcon } from "obsidian";
import React, { useEffect, useRef } from "react";
import {
  toIconCssSize,
  type IconSize,
} from "src/ui/components/common/icon-size";
import { Box } from "src/ui/components/primitives";
import type { BoxProps } from "src/ui/components/primitives/Box";
import { cn } from "src/ui/components/primitives/utils";

export interface ObsidianIconProps extends BoxProps {
  name: string;
  /** 数値は px、文字列は CSS の長さとして SVG に適用する。 */
  size?: IconSize;
}

export const ObsidianIcon = React.forwardRef<HTMLDivElement, ObsidianIconProps>(
  ({ name, size, className, ...restProps }, forwardedRef) => {
    const innerRef = useRef<HTMLDivElement | null>(null);

    // keep forwarded ref in sync
    useEffect(() => {
      if (!forwardedRef) return;
      const node = innerRef.current;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (typeof forwardedRef === "object" && forwardedRef !== null) {
        (forwardedRef as React.RefObject<HTMLDivElement | null>).current = node;
      }
    }, [forwardedRef]);

    useEffect(() => {
      const refEl = innerRef.current;
      if (!refEl) return;

      // Clear previous icon contents if API available
      const maybeEmpty = (refEl as unknown as { empty?: () => void }).empty;
      if (typeof maybeEmpty === "function") {
        maybeEmpty.call(refEl);
      } else {
        refEl.innerHTML = "";
      }

      try {
        setIcon(refEl, name);
      } catch {
        // ignore
      }

      const svg = refEl.querySelector("svg");
      if (!svg) return;

      const setter = svg as unknown as {
        setCssStyles?: (styles: Record<string, string>) => void;
      };
      const cssSize = size == null ? "100%" : toIconCssSize(size);
      setter.setCssStyles?.({
        width: cssSize,
        height: cssSize,
      });
      svg.style.flexShrink = "0";
    }, [name, size]);

    const base =
      "obsidian-icon inline-flex items-center justify-center text-[var(--icon-color)] transition-all duration-150 px-[var(--size-2-3)] py-[var(--size-2-2)] rounded-[var(--corner-shape)] hover:text-[var(--icon-color-hover)] cursor-pointer";

    return (
      <Box ref={innerRef} className={cn(base, className)} {...restProps} />
    );
  },
);

ObsidianIcon.displayName = "ObsidianIcon";

import { setIcon } from "obsidian";
import React, { useEffect, useRef } from "react";
import { toIconCssSize, type IconSize } from "src/core/ui/components/common/icon-size";
import { Box } from "src/core/ui/components/primitives";
import type { BoxProps } from "src/core/ui/components/primitives/Box";
import { cn } from "src/core/ui/components/primitives/utils";

export interface ObsidianIconProps extends BoxProps {
  name: string;
  /** 数値は px、文字列は CSS の長さとして SVG に適用する。 */
  size?: IconSize;
}

type SvgWithCssStyles = Element & { setCssStyles(styles: Record<string, string>): void };

// Obsidian の setIcon が作る SVG には setCssStyles が付いている場合があるため、実行時に確認する。
function hasSetCssStyles(el: Element): el is SvgWithCssStyles {
  return "setCssStyles" in el && typeof el.setCssStyles === "function";
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
        forwardedRef.current = node;
      }
    }, [forwardedRef]);

    useEffect(() => {
      const refEl = innerRef.current;
      if (!refEl) return;

      // Clear previous icon contents if API available
      if (typeof refEl.empty === "function") {
        refEl.empty();
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

      const cssSize = size == null ? "100%" : toIconCssSize(size);
      if (hasSetCssStyles(svg)) {
        svg.setCssStyles({ width: cssSize, height: cssSize });
      }
      svg.classList.add("flex-shrink-0");
    }, [name, size]);

    const base =
      "obsidian-icon inline-flex items-center justify-center text-[var(--icon-color)] transition-all duration-150 px-[var(--size-2-3)] py-[var(--size-2-2)] rounded-[var(--corner-shape)] hover:text-[var(--icon-color-hover)] cursor-pointer";

    return <Box ref={innerRef} className={cn(base, className)} {...restProps} />;
  },
);

ObsidianIcon.displayName = "ObsidianIcon";

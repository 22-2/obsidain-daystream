import type React from "react";
import { Box } from "src/ui/components/primitives";

type CardProps = React.ComponentPropsWithoutRef<"div"> & {
  /** true のとき hover:bg-* を無効化する。postcss safe-important-v4 が全 .セレクタに !important を付与するため、外部 CSS で background を上書きしたい場合に使う */
  disableHoverBg?: boolean;
};

export const Card = (props: CardProps) => {
  const { children, onContextMenu, onDoubleClick, className, disableHoverBg, ...rest } = props;

  return (
    <Box
      className={`mfdi-card relative rounded-sm [border-bottom-right-radius:6px] text-[var(--text-normal)] my-[var(--size-4-1)] transition-all duration-150 shadow-[var(--shadow-xs)] border border-transparent ${disableHoverBg ? "" : "hover:border-[var(--background-modifier-border-hover)]"} ${className ?? ""}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      {...rest}
    >
      {children}
    </Box>
  );
};

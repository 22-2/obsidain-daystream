import type React from "react";
import { Box } from "src/core/ui/components/primitives";

type CardProps = React.ComponentPropsWithoutRef<"div">;

export const Card = (props: CardProps) => {
  const { children, onContextMenu, onDoubleClick, className, ...rest } = props;

  return (
    <Box
      className={`dstr-card relative text-[var(--text-normal)] ${className ?? ""}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      {...rest}
    >
      {children}
    </Box>
  );
};

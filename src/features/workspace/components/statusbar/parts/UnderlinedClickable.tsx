import { clsx } from "clsx";
import type { FC } from "react";
import { Box } from "src/core/ui/components/primitives";
import type { BoxProps } from "src/core/ui/components/primitives/Box";

type UnderlinedClickableProps = BoxProps<"span">;

export const UnderlinedClickable: FC<UnderlinedClickableProps> = ({
  children,
  className,
  onContextMenu,
  onClick,
  ...props
}) => {
  return (
    <Box
      as="span"
      className={clsx("cursor-pointer hover:underline", className)}
      onContextMenu={onContextMenu}
      onClick={onClick}
      {...props}
    >
      {children}
    </Box>
  );
};

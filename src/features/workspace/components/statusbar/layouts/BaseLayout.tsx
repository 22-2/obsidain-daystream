import { clsx } from "clsx";
import type { FC, ReactNode } from "react";
import { Box, HStack } from "src/core/ui/components/primitives";
import type { BoxProps } from "src/core/ui/components/primitives/Box";

type BaseLayoutProps = BoxProps & {
  leftItems?: ReactNode;
  rightItems?: ReactNode;
  className?: string;
};

export const BaseLayout: FC<BaseLayoutProps> = ({
  leftItems: left,
  rightItems: right,
  className,
  ...props
}) => {
  return (
    <HStack
      className={clsx(
        "base-layout",
        // 横幅100%に左右marginを足すとはみ出すため、paddingで余白を確保する。
        "w-full min-w-0 opacity-80",
        "text-[length:var(--font-ui-smaller)] text-[var(--text-muted)]",
        "px-[var(--size-4-4)] my-[var(--size-4-2)]",
        className,
      )}
      gap={0}
      justify="between"
      {...props}
    >
      {left && <Box className="min-w-0 truncate">{left}</Box>}
      {right && <Box className="min-w-0 truncate text-right">{right}</Box>}
    </HStack>
  );
};

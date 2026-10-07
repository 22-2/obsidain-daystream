import { memo, type FC } from "react";
import { Box } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { getCenterIndicatorLabel } from "src/features/workspace/utils/view-state";

export const DisplayModeIndicator: FC<{
  displayMode: "focus" | "timeline";
  threadFocusRootId: string | null;
  activeTag: string | null;
  onClick: () => void;
  className?: string;
}> = memo(({ displayMode, threadFocusRootId, activeTag, onClick, className }) => {
  const text = getCenterIndicatorLabel({
    displayMode,
    threadFocusRootId,
    activeTag,
  });
  return (
    <Box
      className={cn(
        "text-[length:var(--font-ui-smaller)] font-bold text-[var(--text-accent)] cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {text}
    </Box>
  );
});

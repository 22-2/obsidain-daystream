import { memo, type FC } from "react";
import { Box } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { getCenterIndicatorLabel } from "src/ui/utils/view-state";

export const DisplayModeIndicator: FC<{
  displayMode: "focus" | "timeline";
  threadFocusRootId: string | null;
  activeTag: string | null;
  onClick: () => void;
  className?: string;
}> = memo(
  ({ displayMode, threadFocusRootId, activeTag, onClick, className }) => {
    const text = getCenterIndicatorLabel({
      displayMode,
      threadFocusRootId,
      activeTag,
    });
    return (
      <Box
        className={cn(
          "text-[length:var(--font-ui-small)] font-bold text-[var(--text-accent)] cursor-pointer",
          className,
        )}
        onClick={onClick}
      >
        {text}
      </Box>
    );
  },
);

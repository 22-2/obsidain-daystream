import { useId, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { Box, HStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

export const SidebarContainer: React.FC<{
  isOpen: boolean;
  side?: "left" | "right";
  title?: React.ReactNode;
  ariaLabel?: string;
  children: React.ReactNode;
}> = ({ isOpen, side = "right", title, ariaLabel, children }) => {
  const [titleOpen, setTitleOpen] = useState(true);
  const titleContentId = useId();

  return (
    <Box
      aria-label={ariaLabel}
      role="region"
      className={cn(
        isOpen ? "flex w-[260px] min-w-[260px]" : "hidden w-0 min-w-0",
        side === "left"
          ? "mfdi-dashboard-sidebar--left mr-[var(--size-4-2)]"
          : "mfdi-dashboard-sidebar--right ml-[var(--size-4-2)]",
        "mfdi-dashboard-sidebar h-full flex-col py-[var(--size-4-2)] px-0 transition-all duration-200 overflow-hidden rounded-[var(--radius-m)] border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] shadow-[var(--shadow-s)]",
      )}
    >
      {title ? (
        <HStack className="mfdi-panel-title shrink-0 px-3 pb-1 pt-3">
          <button
            type="button"
            className="mfdi-panel-title__toggle flex w-full min-w-0 items-center gap-1 rounded-[var(--radius-s)] border-0 bg-transparent px-0 py-1 text-left text-[length:var(--font-ui-small)] font-bold uppercase tracking-wider text-[var(--text-muted)] shadow-none hover:bg-[var(--background-modifier-hover)]"
            aria-controls={titleContentId}
            aria-expanded={titleOpen}
            onClick={() => setTitleOpen((current) => !current)}
          >
            <ObsidianIcon
              name={titleOpen ? "chevron-down" : "chevron-right"}
              size="0.9em"
            />
            <span className="min-w-0 truncate">{title}</span>
          </button>
        </HStack>
      ) : null}
      <Box
        id={title ? titleContentId : undefined}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {!title || titleOpen ? children : null}
      </Box>
    </Box>
  );
};

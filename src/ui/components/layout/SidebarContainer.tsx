import { Box } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

export const SidebarContainer: React.FC<{
  isOpen: boolean;
  side?: "left" | "right";
  ariaLabel?: string;
  children: React.ReactNode;
}> = ({ isOpen, side = "right", ariaLabel, children }) => {
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
      <Box className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </Box>
    </Box>
  );
};

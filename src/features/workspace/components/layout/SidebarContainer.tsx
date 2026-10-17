import type React from "react";
import { Box } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";

export const SidebarContainer: React.FC<{
  isOpen: boolean;
  side?: "left" | "right";
  children: React.ReactNode;
}> = ({ isOpen, side = "right", children }) => {
  return (
    <Box
      role="region"
      className={cn(
        isOpen
          ? "flex w-[var(--dstr-panel-width)] min-w-[var(--dstr-panel-width)]"
          : "hidden w-0 min-w-0",
        side === "left"
          ? "dstr-dashboard-sidebar--left mr-[var(--size-4-2)]"
          : "dstr-dashboard-sidebar--right ml-[var(--size-4-2)]",
        "dstr-dashboard-sidebar h-full flex-col py-[var(--size-4-2)] px-0 transition-all duration-200 overflow-hidden rounded-[var(--radius-m)] border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] shadow-[var(--shadow-s)]",
      )}
    >
      <Box className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</Box>
    </Box>
  );
};

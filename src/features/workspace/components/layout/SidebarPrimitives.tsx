import { Box, HStack, Text } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";

export const SidebarSectionHeader: React.FC<{
  children: React.ReactNode;
  rightAddon?: React.ReactNode;
  className?: string;
}> = ({ children, rightAddon, className }) => {
  return (
    <HStack
      className={cn(
        "sidebar-section-header",
        "justify-between px-[var(--dstr-panel-section-padding-inline)]",
        className,
      )}
    >
      <Text className="text-[length:var(--dstr-panel-heading-font-size)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
        {children}
      </Text>
      {rightAddon}
    </HStack>
  );
};

export const SidebarTextButton: React.FC<{
  isSelected?: boolean;
  isMuted?: boolean;
  className?: string;
  onClick?: () => void;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}> = ({ isSelected = false, isMuted = false, className, onClick, onContextMenu, children }) => {
  return (
    <Box
      className={cn(
        "sidebar-text-button",
        "flex items-center px-[var(--dstr-panel-item-padding-inline)] h-[var(--dstr-panel-item-height)]",
        "rounded-[var(--radius-s)] text-[length:var(--dstr-panel-label-font-size)]",
        "leading-[1.2] whitespace-nowrap",
        "transition-colors duration-100 ease-in-out",
        isSelected
          ? "font-bold text-[var(--color-accent)] sidebar-text-button--selected"
          : isMuted
            ? "font-normal text-[var(--text-muted)]"
            : "font-normal text-[var(--text-normal)]",
        isMuted && "sidebar-text-button--muted",
        onClick ? "cursor-pointer" : "cursor-default",
        onClick && "hover:bg-[var(--background-modifier-hover)]",
        className,
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {children}
    </Box>
  );
};

export const SidebarItemCount: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Text className="sidebar-item-count text-[length:var(--dstr-panel-meta-font-size)] text-[var(--text-muted)] ml-1 flex-shrink-0 leading-none">
      {children}
    </Text>
  );
};

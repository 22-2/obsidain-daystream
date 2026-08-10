import { SidebarSectionHeader } from "src/ui/components/layout/SidebarPrimitives";
import { VStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

/** 左右どちらのパネルでも使う、見出し・余白・縦積みの共通セクション。 */
export const PanelSection: React.FC<{
  title: React.ReactNode;
  rightAddon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, rightAddon, className, children }) => {
  return (
    <VStack className={cn("mfdi-panel-section items-stretch gap-2", className)}>
      <SidebarSectionHeader rightAddon={rightAddon}>
        {title}
      </SidebarSectionHeader>
      {children}
    </VStack>
  );
};

export const PanelDivider: React.FC = () => (
  <div className="mfdi-panel-divider border-t border-[var(--background-modifier-border)]" />
);

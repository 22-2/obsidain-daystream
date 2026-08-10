import { useId, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { VStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

/** 左右どちらのパネルでも使う、見出し・余白・縦積みの共通セクション。 */
export const PanelSection: React.FC<{
  title: React.ReactNode;
  rightAddon?: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  onTitleClick?: () => void;
  children: React.ReactNode;
}> = ({
  title,
  rightAddon,
  className,
  defaultOpen = true,
  collapsible = true,
  onTitleClick,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const expanded = !collapsible || isOpen;

  return (
    <VStack className={cn("mfdi-panel-section items-stretch gap-2 pb-2", className)}>
      <div className="mfdi-panel-section__header group flex min-w-0 items-center justify-between gap-2 px-2">
        <button
          type="button"
          className="mfdi-panel-section__toggle !h-auto flex min-w-0 min-h-0 flex-1 justify-start items-center gap-1 rounded-[var(--radius-s)] border-0 bg-transparent px-0 py-1 leading-5 text-left text-[length:var(--font-ui-small)] font-bold uppercase tracking-wider text-[var(--text-muted)] shadow-none hover:bg-[var(--background-modifier-hover)]"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={() => {
            if (collapsible) setIsOpen((current) => !current);
            onTitleClick?.();
          }}
        >
          {collapsible ? (
            <ObsidianIcon
              name={expanded ? "chevron-down" : "chevron-right"}
              size="0.9em"
            />
          ) : null}
          <span className="min-w-0 truncate">{title}</span>
        </button>
        {rightAddon}
      </div>
      {expanded ? (
        <div id={contentId} className="mfdi-panel-section__content">
          {children}
        </div>
      ) : null}
    </VStack>
  );
};

export const PanelDivider: React.FC = () => (
  <div className="mfdi-panel-divider border-t border-[var(--background-modifier-border)]" />
);

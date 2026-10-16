import { useEffect, useId, useState } from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { VStack } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { STORAGE_KEYS } from "src/features/workspace/config/constants";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";

/** 左右どちらのパネルでも使う、見出し・余白・縦積みの共通セクション。 */
export const PanelSection: React.FC<{
  title: React.ReactNode;
  rightAddon?: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  /** 開閉状態を保存するための安定した識別子。未指定時は文字列タイトルを使う。 */
  storageKey?: string;
  onTitleClick?: () => void;
  children: React.ReactNode;
}> = ({
  title,
  rightAddon,
  className,
  defaultOpen = true,
  collapsible = true,
  storageKey,
  onTitleClick,
  children,
}) => {
  const storage = useSettingsStore((state) => state.storage);
  const resolvedStorageKey = storageKey ?? (typeof title === "string" ? title : null);
  const [isOpen, setIsOpen] = useState(() => {
    if (!resolvedStorageKey) return defaultOpen;
    return (
      storage?.get<Record<string, boolean>>(STORAGE_KEYS.PANEL_SECTION_STATES, {})[
        resolvedStorageKey
      ] ?? defaultOpen
    );
  });
  const contentId = useId();
  const expanded = !collapsible || isOpen;

  useEffect(() => {
    if (!storage || !resolvedStorageKey) return;
    const saved = storage.get<Record<string, boolean>>(STORAGE_KEYS.PANEL_SECTION_STATES, {})[
      resolvedStorageKey
    ];
    if (typeof saved === "boolean") setIsOpen(saved);
  }, [resolvedStorageKey, storage]);

  const toggle = () => {
    if (!collapsible) {
      onTitleClick?.();
      return;
    }
    setIsOpen((current) => {
      const next = !current;
      if (storage && resolvedStorageKey) {
        const states = storage.get<Record<string, boolean>>(STORAGE_KEYS.PANEL_SECTION_STATES, {});
        storage.set(STORAGE_KEYS.PANEL_SECTION_STATES, {
          ...states,
          [resolvedStorageKey]: next,
        });
      }
      return next;
    });
    onTitleClick?.();
  };

  return (
    <VStack
      className={cn(
        "dstr-panel-section items-stretch gap-[var(--dstr-panel-section-gap)] px-[var(--dstr-panel-section-padding-inline)] pb-[var(--dstr-panel-section-padding-bottom)]",
        className,
      )}
    >
      <div className="dstr-panel-section__header group flex min-w-0 items-center justify-between gap-2">
        <button
          type="button"
          className="dstr-panel-section__toggle !h-auto flex min-w-0 min-h-0 flex-1 justify-start items-center gap-1 rounded-[var(--radius-s)] border-0 bg-transparent px-0 py-[var(--dstr-panel-heading-padding-block)] leading-[var(--dstr-panel-heading-line-height)] text-left text-[length:var(--dstr-panel-heading-font-size)] font-bold uppercase tracking-wider text-[var(--text-muted)] shadow-none hover:bg-[var(--background-modifier-hover)]"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={toggle}
        >
          {collapsible ? (
            <ObsidianIcon name={expanded ? "chevron-down" : "chevron-right"} size="0.9em" />
          ) : null}
          <span className="min-w-0 truncate">{title}</span>
        </button>
        {rightAddon}
      </div>
      {expanded ? (
        <div id={contentId} className="dstr-panel-section__content">
          {children}
        </div>
      ) : null}
    </VStack>
  );
};

export const PanelDivider: React.FC = () => (
  <div className="dstr-panel-divider border-t border-[var(--background-modifier-border)]" />
);

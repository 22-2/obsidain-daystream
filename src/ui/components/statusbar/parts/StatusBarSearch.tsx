import { Menu } from "obsidian";
import { useCallback, useEffect, useRef, type FC } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { HStack, Input } from "src/ui/components/primitives";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MFDIView } from "src/ui/view/MFDIView";
import { useShallow } from "zustand/shallow";

export const StatusBarSearch: FC = () => {
  const component = useObsidianComponent() as MFDIView;
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    searchQuery,
    threadOnly,
    setSearchQuery,
    setSearchInputOpen,
    setThreadOnly,
  } = useSettingsStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      threadOnly: s.threadOnly,
      setSearchQuery: s.setSearchQuery,
      setSearchInputOpen: s.setSearchInputOpen,
      setThreadOnly: s.setThreadOnly,
    })),
  );

  const focusSearch = useCallback(() => {
    setSearchInputOpen(true);
    window.setTimeout(() => inputRef.current?.focus());
  }, [setSearchInputOpen]);

  const closeSearch = useCallback(() => {
    setSearchInputOpen(false);
    inputRef.current?.blur();
  }, [setSearchInputOpen]);

  useEffect(() => {
    component.actionDelegates.onSearchQueryChange = setSearchQuery;
    component.actionDelegates.onSearchInputOpen = focusSearch;
    component.actionDelegates.onSearchInputClose = closeSearch;

    return () => {
      component.actionDelegates.onSearchQueryChange = undefined;
      component.actionDelegates.onSearchInputOpen = undefined;
      component.actionDelegates.onSearchInputClose = undefined;
    };
  }, [component, closeSearch, focusSearch, setSearchQuery]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const menu = new Menu();
      menu.addItem((item) =>
        item
          .setTitle("すべて")
          .setChecked(!threadOnly)
          .onClick(() => setThreadOnly(false)),
      );
      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle("スレッドのみ")
          .setChecked(threadOnly)
          .onClick(() => setThreadOnly(true)),
      );
      menu.showAtMouseEvent(event.nativeEvent);
    },
    [setThreadOnly, threadOnly],
  );

  return (
    <HStack className="mfdi-statusbar-search min-w-0 flex-1 gap-1">
      <ObsidianIcon
        name="search"
        size="1em"
        className="pointer-events-none shrink-0 cursor-default p-0 text-[var(--text-muted)] hover:text-[var(--text-muted)]"
      />
      <Input
        ref={inputRef}
        type="search"
        value={searchQuery}
        placeholder="検索"
        aria-label="検索"
        className="mfdi-statusbar-search__input h-[28px] min-w-0 max-w-[22em] flex-1 rounded-[var(--input-radius)] border border-[var(--background-modifier-border)] bg-[var(--background-modifier-form-field)] px-2 py-1 text-[length:var(--font-ui-small)] text-[var(--text-normal)] shadow-none placeholder:text-[var(--text-muted)] focus:ring-0"
        onFocus={() => setSearchInputOpen(true)}
        onBlur={() => setSearchInputOpen(false)}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          closeSearch();
        }}
        onContextMenu={handleContextMenu}
      />
    </HStack>
  );
};

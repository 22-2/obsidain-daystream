import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { HStack, Input } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { useTagCounts } from "src/ui/hooks/useTagCounts";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

const COLLAPSED_TAG_COUNT = 12;

export const SearchControls: FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const tags = useTagCounts();
  const {
    searchInputOpen,
    searchQuery,
    setSearchInputOpen,
    setSearchQuery,
    setThreadOnly,
    threadOnly,
  } = useSettingsStore(
    useShallow((state) => ({
      searchInputOpen: state.searchInputOpen,
      searchQuery: state.searchQuery,
      setSearchInputOpen: state.setSearchInputOpen,
      setSearchQuery: state.setSearchQuery,
      setThreadOnly: state.setThreadOnly,
      threadOnly: state.threadOnly,
    })),
  );

  useEffect(() => {
    if (!searchInputOpen) return;
    // 意図: タブクリックと Ctrl+F のどちらから開いても、同じ入力欄へ確実にフォーカスする。
    const timer = window.setTimeout(() => inputRef.current?.focus());
    return () => window.clearTimeout(timer);
  }, [searchInputOpen]);

  const visibleTags = useMemo(
    () => (showAllTags ? tags : tags?.slice(0, COLLAPSED_TAG_COUNT)),
    [showAllTags, tags],
  );

  return (
    <section className="mfdi-search-controls" aria-labelledby="mfdi-search-heading">
      <h2 id="mfdi-search-heading">検索</h2>
      <HStack className="mfdi-search-controls__input-row gap-2">
        <ObsidianIcon
          name="search"
          size="16px"
          className="pointer-events-none size-4 shrink-0 p-0 text-[var(--text-muted)]"
        />
        <Input
          ref={inputRef}
          type="search"
          value={searchQuery}
          placeholder="本文・URL・タグを検索"
          aria-label="本文・URL・タグを検索"
          className="mfdi-search-controls__input"
          onFocus={() => setSearchInputOpen(true)}
          onBlur={() => setSearchInputOpen(false)}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            setSearchInputOpen(false);
            inputRef.current?.blur();
          }}
        />
      </HStack>
      <div className="mfdi-search-controls__filters" aria-label="検索対象">
        <button
          type="button"
          className={cn("mfdi-search-chip", !threadOnly && "is-active")}
          onClick={() => setThreadOnly(false)}
        >
          すべて
        </button>
        <button
          type="button"
          className={cn("mfdi-search-chip", threadOnly && "is-active")}
          onClick={() => setThreadOnly(true)}
        >
          スレッドのみ
        </button>
      </div>
      {visibleTags?.length ? (
        <div className="mfdi-search-controls__tags" aria-label="タグから検索">
          {visibleTags.map(({ tag, count }) => {
            const query = tag.startsWith("#") ? tag : `#${tag}`;
            return (
              <button
                key={tag}
                type="button"
                className={cn("mfdi-search-chip", searchQuery === query && "is-active")}
                onClick={() => setSearchQuery(query)}
              >
                <span>{query}</span>
                <small>{count}</small>
              </button>
            );
          })}
          {tags && tags.length > COLLAPSED_TAG_COUNT ? (
            <button
              type="button"
              className="mfdi-search-controls__more"
              onClick={() => setShowAllTags((value) => !value)}
            >
              {showAllTags ? "閉じる" : "すべて見る"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

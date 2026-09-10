import { useEffect, useRef, type FC } from "react";
import { Input } from "src/ui/components/primitives";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const SearchControls: FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchInputOpen, searchQuery, setSearchInputOpen, setSearchQuery } = useSettingsStore(
    useShallow((state) => ({
      searchInputOpen: state.searchInputOpen,
      searchQuery: state.searchQuery,
      setSearchInputOpen: state.setSearchInputOpen,
      setSearchQuery: state.setSearchQuery,
    })),
  );

  useEffect(() => {
    if (!searchInputOpen) return;
    // 意図: タブクリックと Ctrl+F のどちらから開いても、同じ入力欄へ確実にフォーカスする。
    const timer = window.setTimeout(() => inputRef.current?.focus());
    return () => window.clearTimeout(timer);
  }, [searchInputOpen]);

  return (
    <section className="mfdi-search-controls" aria-label="検索">
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
    </section>
  );
};

import { useEffect, useState } from "react";
import { subscribeToDBUpdates } from "src/core/db/updates";
import { useDSTRDB } from "src/core/db/hooks/useDSTRDB";

export interface TagCountItem {
  tag: string;
  count: number;
}

/** タグ一覧をサイドバーと検索ビューで同じ並び・更新タイミングで共有する。 */
export function useTagCounts(): TagCountItem[] | null {
  const db = useDSTRDB();
  const [items, setItems] = useState<TagCountItem[] | null>(null);
  const [stableItems, setStableItems] = useState<TagCountItem[] | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchItems = async () => {
      if (!db) {
        if (mounted) setItems(null);
        return;
      }
      try {
        const tagStats = await db.getTagStats();
        const sorted = tagStats
          .map(({ tag, count }) => ({ tag, count }))
          .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ja"));
        if (mounted) setItems(sorted);
      } catch (error) {
        console.error("Failed to fetch tag stats:", error);
      }
    };

    void fetchItems();
    const unsubscribe = subscribeToDBUpdates(() => void fetchItems());

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [db]);

  useEffect(() => {
    // 意図: DB 再構築中の一時的な空配列で、表示中のタグ候補がちらつくのを防ぐ。
    if (items != null && items.length > 0) setStableItems(items);
  }, [items]);

  return stableItems ?? items;
}

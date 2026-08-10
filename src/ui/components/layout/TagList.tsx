import { useEffect, useState } from "react";
import {
  SidebarItemCount,
  SidebarTextButton,
} from "src/ui/components/layout/SidebarPrimitives";
import { PanelSection } from "src/ui/components/layout/PanelPrimitives";
import { HStack, Text, VStack } from "src/ui/components/primitives";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

interface TagCountItem {
  tag: string;
  count: number;
}

export const TagList: React.FC = () => {
  const { activeTag, setActiveTag } = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      setActiveTag: s.setActiveTag,
    })),
  );

  const db = useMFDIDB();
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
          .sort(
            (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ja"),
          );

        if (mounted) setItems(sorted);
      } catch (e) {
        console.error("Failed to fetch tag stats:", e);
      }
    };

    fetchItems();

    const channel = new BroadcastChannel("mfdi-db-updates");
    channel.onmessage = (event) => {
      if (event?.data?.type === "mfdi-db-updated") void fetchItems();
    };

    return () => {
      mounted = false;
      channel.close();
    };
  }, [db]);

  useEffect(() => {
    if (items != null && items.length > 0) setStableItems(items);
  }, [items]);

  const displayItems = stableItems ?? items;

  if (!displayItems?.length) return null;

  return (
    <PanelSection title="タグ" className="mfdi-tag-section px-2 pt-2">
      <VStack className="mfdi-tag-list gap-0 items-stretch">
        {displayItems.map((item) => {
          const isActive = activeTag === item.tag;
          return (
            <SidebarTextButton
              key={item.tag}
              isSelected={isActive}
              className={`mfdi-scale-item mfdi-scale-item-tag ${isActive ? "is-selected" : ""}`}
              onClick={() => setActiveTag(isActive ? null : item.tag)}
            >
              <HStack className="w-full gap-0 justify-between">
                <Text as="span">{item.tag}</Text>
                <SidebarItemCount>{item.count}</SidebarItemCount>
              </HStack>
            </SidebarTextButton>
          );
        })}
      </VStack>
    </PanelSection>
  );
};

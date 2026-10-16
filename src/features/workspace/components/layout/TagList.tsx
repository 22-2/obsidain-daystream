import { PanelSection } from "src/features/workspace/components/layout/PanelPrimitives";
import { SidebarItemCount, SidebarTextButton } from "src/features/workspace/components/layout/SidebarPrimitives";
import { HStack, Text, VStack } from "src/core/ui/components/primitives";
import { useTagCounts } from "src/features/notes/hooks/useTagCounts";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const TagList: React.FC = () => {
  const { activeTag, setActiveTag } = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      setActiveTag: s.setActiveTag,
    })),
  );

  const displayItems = useTagCounts();

  if (!displayItems?.length) return null;

  return (
    <PanelSection title="タグ" storageKey="periodic-tags" className="daystream-tag-section">
      <VStack className="daystream-tag-list items-stretch gap-0">
        {displayItems.map((item) => {
          const isActive = activeTag === item.tag;
          return (
            <SidebarTextButton
              key={item.tag}
              isSelected={isActive}
              className={`daystream-scale-item daystream-scale-item-tag ${isActive ? "is-selected" : ""}`}
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

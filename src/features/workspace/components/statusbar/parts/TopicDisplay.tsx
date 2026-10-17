import type React from "react";
import { Menu } from "obsidian";
import type { FC } from "react";
import { UnderlinedClickable } from "src/features/workspace/components/statusbar/parts/UnderlinedClickable";
import { useAppStore } from "src/features/workspace/store/appStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

const buildTopicMenu = (
  topics: { id: string; title: string; archived?: boolean }[],
  activeTopicName: string,
  onTopicChange: (id: string) => void,
  e: React.MouseEvent,
) => {
  const menu = new Menu();
  menu.addSeparator();
  menu.addItem((item) => item.setTitle("トピック").setIcon("tag").setDisabled(true));
  topics
    .filter((t) => !t.archived)
    .forEach((topic) => {
      menu.addItem((item) =>
        item
          .setTitle(topic.title)
          .setChecked(topic.title === activeTopicName)
          .onClick(() => onTopicChange(topic.id)),
      );
    });
  menu.showAtMouseEvent(e.nativeEvent);
};

export const TopicDisplay: FC = () => {
  const settings = useAppStore((s) => s.pluginSettings);
  const { activeTopic, setActiveTopic, viewNoteMode } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      setActiveTopic: s.setActiveTopic,
      viewNoteMode: s.viewNoteMode,
    })),
  );

  if (viewNoteMode === "fixed" || !settings) return null;

  const activeTopicName = settings.topics.find((t) => t.id === activeTopic)?.title;

  if (!activeTopicName) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    buildTopicMenu(settings.topics, activeTopicName, setActiveTopic, e);
  };

  return (
    <>
      {" in "}
      <UnderlinedClickable className="topic-display" onClick={handleClick}>
        {activeTopicName}
      </UnderlinedClickable>
    </>
  );
};

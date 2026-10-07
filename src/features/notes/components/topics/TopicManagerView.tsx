import { useCallback, useRef, useState } from "react";
import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { Box, Button, Divider, Flex, Heading, VStack } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { TopicAddForm } from "src/features/notes/components/topics/TopicAddForm";
import { TopicItem } from "src/features/notes/components/topics/TopicItem";

const TOPIC_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/;

interface TopicManagerViewProps {
  topics: Topic[];
  activeTopic: string;
  onSave: (topics: Topic[], activeTopic: string) => Promise<void>;
  onClose: () => void;
}

export const TopicManagerView = ({
  topics: initialTopics,
  activeTopic: initialActiveTopic,
  onSave: externalOnSave,
}: TopicManagerViewProps) => {
  const {
    topics,
    activeTopic,
    showAddForm,
    setShowAddForm,
    newTitle,
    setNewTitle,
    newId,
    setNewId,
    idError,
    editingId,
    setEditingId,
    editingTitle,
    setEditingTitle,
    editInputRef,
    handleSwitch,
    handleToggleArchive,
    commitTitleEdit,
    handleAddSubmit,
    handleCancelAdd,
    onSave,
  } = useTopicManagerViewState(initialTopics, initialActiveTopic, externalOnSave);

  const activeTopics = topics.filter((t) => !t.archived);
  const archivedTopics = topics.filter((t) => t.archived);

  return (
    <VStack className={cn("flex flex-col items-stretch space-y-0 pb-[var(--size-4-4)]")}>
      {/* 通常トピック一覧 */}
      <VStack className={cn("flex flex-col items-stretch space-y-2")}>
        {activeTopics.map((topic) => (
          <TopicItem
            key={topic.id}
            topic={topic}
            isActive={topic.id === activeTopic}
            isEditing={editingId === topic.id}
            editingTitle={editingTitle}
            editInputRef={editInputRef}
            onSwitch={handleSwitch}
            onToggleArchive={handleToggleArchive}
            onStartEdit={(id, title) => {
              setEditingId(id);
              setEditingTitle(title);
            }}
            onEditingTitleChange={setEditingTitle}
            onCommitEdit={commitTitleEdit}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}
      </VStack>

      {/* 追加フォーム */}
      {showAddForm ? (
        <TopicAddForm
          newTitle={newTitle}
          newId={newId}
          idError={idError}
          onTitleChange={setNewTitle}
          onIdChange={setNewId}
          onSubmit={handleAddSubmit}
          onCancel={handleCancelAdd}
        />
      ) : (
        <Button
          onClick={() => setShowAddForm(true)}
          className={cn(
            "mt-[var(--size-4-3)] flex items-center justify-start text-sm text-[var(--text-muted)]",
            "bg-transparent hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]",
            "transition-colors",
          )}
        >
          <ObsidianIcon name="plus" className={cn("mr-2 h-[1em] w-[1em]")} />
          新しいトピックを追加
        </Button>
      )}

      {/* アーカイブ済み一覧 */}
      {archivedTopics.length > 0 && (
        <VStack className={cn("flex flex-col items-stretch space-y-2 mt-[var(--size-4-6)]")}>
          <Flex className={cn("flex items-center px-[var(--size-4-3)]")}>
            <Heading
              className={cn(
                "text-[0.75rem] font-semibold text-[var(--text-faint)] uppercase tracking-wider",
              )}
            >
              アーカイブ済み ({archivedTopics.length})
            </Heading>
            <Box className={cn("flex-1 ml-[var(--size-4-2)]")}>
              <Divider
                className={cn("border-t border-[var(--background-modifier-border)] opacity-50")}
              />
            </Box>
          </Flex>
          <VStack className={cn("flex flex-col items-stretch space-y-2")}>
            {archivedTopics.map((topic) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                isActive={topic.id === activeTopic}
                isEditing={editingId === topic.id}
                editingTitle={editingTitle}
                editInputRef={editInputRef}
                onSwitch={handleSwitch}
                onToggleArchive={handleToggleArchive}
                onStartEdit={(id, title) => {
                  setEditingId(id);
                  setEditingTitle(title);
                }}
                onEditingTitleChange={setEditingTitle}
                onCommitEdit={commitTitleEdit}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </VStack>
        </VStack>
      )}

      {/* 完了ボタン */}
      <Box
        className={cn(
          "mt-[var(--size-4-6)] border-t border-[var(--background-modifier-border)] pt-[var(--size-4-4)]",
        )}
      >
        <Button
          onClick={onSave}
          className={cn(
            "w-full bg-[var(--color-accent)] text-[var(--text-on-accent)]",
            "hover:bg-[var(--color-accent-2)] transition-colors py-2 rounded",
          )}
        >
          完了
        </Button>
      </Box>
    </VStack>
  );
};

// ... useTopicManagerViewState はロジック部分なので変更なし ...
const useTopicManagerViewState = (
  initialTopics: Topic[],
  initialActiveTopic: string,
  onSave: (topics: Topic[], activeTopic: string) => Promise<void>,
) => {
  const [topics, setTopics] = useState<Topic[]>(
    initialTopics.length > 0 ? initialTopics : [DEFAULT_TOPIC],
  );
  const [activeTopic] = useState<string>(initialActiveTopic);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newId, setNewId] = useState("");
  const [idError, setIdError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const isSaving = useRef(false);

  const handleSwitch = useCallback(
    async (topicId: string) => {
      if (isSaving.current) return;
      isSaving.current = true;
      try {
        const updatedTopics = topics.map((topic) =>
          topic.id === topicId ? { ...topic, archived: false } : topic,
        );
        await onSave(updatedTopics, topicId);
      } finally {
        isSaving.current = false;
      }
    },
    [topics, onSave],
  );

  const handleToggleArchive = useCallback((topicId: string) => {
    setTopics((prev) =>
      prev.map((topic) => (topic.id === topicId ? { ...topic, archived: !topic.archived } : topic)),
    );
  }, []);

  const commitTitleEdit = useCallback(() => {
    if (editingId === null) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setTopics((prev) =>
      prev.map((topic) => (topic.id === editingId ? { ...topic, title: trimmed } : topic)),
    );
    setEditingId(null);
  }, [editingId, editingTitle]);

  const handleAddSubmit = useCallback(() => {
    const trimmedId = newId.trim();
    const trimmedTitle = newTitle.trim();

    if (!trimmedId) {
      setIdError("IDを入力してください");
      return;
    }
    if (!TOPIC_ID_REGEX.test(trimmedId)) {
      setIdError("英小文字・数字・ハイフンのみ使用可（先頭は英数字）");
      return;
    }
    if (topics.some((topic) => topic.id === trimmedId)) {
      setIdError("このIDはすでに使用されています");
      return;
    }

    const newTopic: Topic = {
      id: trimmedId,
      title: trimmedTitle || trimmedId,
    };
    setTopics((prev) => [...prev, newTopic]);
    setNewTitle("");
    setNewId("");
    setIdError("");
    setShowAddForm(false);
  }, [newId, newTitle, topics]);

  const handleCancelAdd = useCallback(() => {
    setNewTitle("");
    setNewId("");
    setIdError("");
    setShowAddForm(false);
  }, []);

  return {
    topics,
    activeTopic,
    showAddForm,
    setShowAddForm,
    newTitle,
    setNewTitle,
    newId,
    setNewId,
    idError,
    editingId,
    setEditingId,
    editingTitle,
    setEditingTitle,
    editInputRef,
    handleSwitch,
    handleToggleArchive,
    commitTitleEdit,
    handleAddSubmit,
    handleCancelAdd,
    onSave: () => onSave(topics, activeTopic),
  };
};

import { Menu, Notice, TFile } from "obsidian";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import {
  ensureFixedSessionHeading,
  removeFixedSessionSection,
} from "src/core/fixed-sessions";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import {
  SidebarSectionHeader,
  SidebarTextButton,
} from "src/ui/components/layout/SidebarPrimitives";
import {
  Box,
  HStack,
  Spinner,
  Text,
  VStack,
} from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import {
  getDraftMetadataStorageKey,
  getInputStorageKey,
} from "src/ui/store/slices/inputStorage";
import {
  readFixedSessionMeta,
  removeFixedSessionMeta,
  updateFixedSessionMeta,
  writeLastOpenedFixedSessionNumber,
} from "src/ui/utils/fixed-session-storage";
import {
  buildFixedSessionSummaries,
  type FixedSessionSummary,
} from "src/ui/utils/fixed-session-utils";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function sortSessions(sessions: FixedSessionSummary[]): FixedSessionSummary[] {
  return [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    // 意図: セッション並びは編集時刻の揺れに影響されないよう、作成時刻を唯一の基準に固定する。
    const aTime = a.createdAt ? window.moment(a.createdAt).valueOf() : 0;
    const bTime = b.createdAt ? window.moment(b.createdAt).valueOf() : 0;
    if (aTime !== bTime) return bTime - aTime;

    return a.sessionNumber - b.sessionNumber;
  });
}

function groupSessionsByActivity(sessions: FixedSessionSummary[]): {
  pinned: FixedSessionSummary[];
  last7Days: FixedSessionSummary[];
  older: FixedSessionSummary[];
} {
  const threshold = window.moment().subtract(7, "days");
  const sorted = sortSessions(sessions);
  const pinned = sorted.filter((session) => session.pinned);
  const unpinned = sorted.filter((session) => !session.pinned);

  const isRecent = (session: FixedSessionSummary): boolean => {
    if (!session.lastActiveAt) return false;
    const t = window.moment(session.lastActiveAt);
    return t.isValid() && t.isSameOrAfter(threshold);
  };

  return {
    pinned,
    last7Days: unpinned.filter(isRecent),
    older: unpinned.filter((session) => !isRecent(session)),
  };
}

function formatLastActiveLabel(lastActiveAt: string | null): string {
  if (!lastActiveAt) return "No activity yet";
  const t = window.moment(lastActiveAt);
  return t.isValid() ? t.fromNow() : "No activity yet";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SessionItemProps {
  session: FixedSessionSummary;
  isSelected: boolean;
  onSelect: (sessionNumber: number) => void;
  onTogglePin: (sessionNumber: number) => Promise<void>;
  onOpenMenu: (
    session: FixedSessionSummary,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isSelected,
  onSelect,
  onTogglePin,
  onOpenMenu,
}) => {
  const handlePinClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    void onTogglePin(session.sessionNumber);
  };

  return (
    <SidebarTextButton
      isSelected={isSelected}
      className={cn(
        "!h-auto min-h-[48px] whitespace-normal rounded-[var(--radius-s)] px-[var(--mfdi-panel-item-padding-inline)] py-[var(--mfdi-panel-item-padding-block)]",
        {
          "bg-transparent": !isSelected,
          "bg-[var(--background-modifier-hover)]": isSelected,
        },
      )}
      onClick={() => onSelect(session.sessionNumber)}
      onContextMenu={(event) => onOpenMenu(session, event)}
    >
      <VStack className="w-full items-stretch gap-1">
        <HStack className="w-full items-start justify-between gap-2">
          <HStack className="min-w-0 items-center gap-1.5">
            <Text
              as="span"
              className={cn(
                "truncate text-[length:var(--mfdi-panel-label-font-size)] font-medium leading-[1.2]",
                isSelected && "text-[var(--color-accent)]",
              )}
            >
              {session.title}
            </Text>
          </HStack>
          <Box
            className="flex h-[var(--mfdi-panel-item-height)] w-[var(--mfdi-panel-item-height)] cursor-pointer items-center justify-center rounded-[var(--radius-s)] hover:bg-[var(--background-modifier-hover)]"
            onClick={handlePinClick}
          >
            <ObsidianIcon
              name="pin"
              boxSize="0.95em"
              className={cn(
                session.pinned
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--text-faint)] opacity-60",
              )}
            />
          </Box>
        </HStack>
        <Text className="text-[length:var(--mfdi-panel-meta-font-size)] leading-[1.25] text-[var(--text-muted)]">
          {formatLastActiveLabel(session.lastActiveAt)}
        </Text>
      </VStack>
    </SidebarTextButton>
  );
};

interface SessionGroupProps {
  title: string;
  sessions: FixedSessionSummary[];
  selectedSessionNumber: number;
  onSelect: (sessionNumber: number) => void;
  onTogglePin: (sessionNumber: number) => Promise<void>;
  onOpenMenu: (
    session: FixedSessionSummary,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
}

interface FixedSessionFetchResult {
  noteExists: boolean;
  sessionCount: number;
  sessions: FixedSessionSummary[];
}

const SessionGroup: React.FC<SessionGroupProps> = ({
  title,
  sessions,
  selectedSessionNumber,
  onSelect,
  onTogglePin,
  onOpenMenu,
}) => {
  if (sessions.length === 0) return null;

  return (
    <VStack className="items-stretch gap-1.5">
      <SidebarSectionHeader
        className="justify-between px-2 pt-3"
        rightAddon={
          <Text className="text-[length:var(--mfdi-panel-meta-font-size)] font-medium text-[var(--text-muted)]">
            {sessions.length}
          </Text>
        }
      >
        {title}
      </SidebarSectionHeader>
      <VStack className="items-stretch gap-1 px-1">
        {sessions.map((session) => (
          <SessionItem
            key={session.sessionNumber}
            session={session}
            isSelected={session.sessionNumber === selectedSessionNumber}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
            onOpenMenu={onOpenMenu}
          />
        ))}
      </VStack>
    </VStack>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const FixedSessionSidebar: React.FC = () => {
  const { shell, settings } = useAppContext();
  const { confirmDelete, showTextInput } = useObsidianUi();
  const { file, storage, createNoteWithInsertAfter } = useAppStore(
    useShallow((state) => ({
      file: state.file,
      storage: state.storage,
      createNoteWithInsertAfter: state.createNoteWithInsertAfter,
    })),
  );
  const { fixedSessionNumber, setFixedSessionNumber } = useSettingsStore(
    useShallow((state) => ({
      fixedSessionNumber: state.fixedSessionNumber,
      setFixedSessionNumber: state.setFixedSessionNumber,
    })),
  );
  const { editingPost } = useEditorStore(
    useShallow((state) => ({ editingPost: state.editingPost })),
  );

  const normalizedFixedPath = useMemo(
    () => normalizeFixedNotePath(file ?? ""),
    [file],
  );

  const {
    data: fixedSessionFetch,
    mutate,
    isLoading,
  } = useSWR<FixedSessionFetchResult>(
    normalizedFixedPath
      ? ["posts", "fixed-sessions", normalizedFixedPath, settings.insertAfter]
      : null,
    async () => {
      const note = shell.getAbstractFileByPath(normalizedFixedPath);
      if (!(note instanceof TFile)) {
        return {
          noteExists: false,
          sessionCount: 0,
          sessions: [],
        };
      }

      let content = "";
      try {
        content = await shell.loadFile(note.path);
      } catch {
        return {
          noteExists: false,
          sessionCount: 0,
          sessions: [],
        };
      }
      const sessions = buildFixedSessionSummaries({
        content,
        insertAfter: settings.insertAfter,
        metaMap: await readFixedSessionMeta(shell, storage, note.path),
      });

      return {
        noteExists: true,
        sessionCount: sessions.length,
        sessions,
      };
    },
  );

  const sessions = fixedSessionFetch?.sessions ?? [];
  const shouldShowLoading =
    normalizedFixedPath.length === 0 || isLoading || fixedSessionFetch == null;

  const groupedSessions = useMemo(
    () => groupSessionsByActivity(sessions),
    [sessions],
  );

  useEffect(() => {
    if (!fixedSessionFetch?.noteExists) {
      return;
    }

    // 意図: fixed ノートを reopen したときは新しい leaf に前回の viewState が無いことがある。
    // session 選択をノート単位で退避しておくと、再オープンでも最後の位置から再開できる。
    writeLastOpenedFixedSessionNumber(
      storage,
      normalizedFixedPath,
      fixedSessionNumber,
    );
  }, [
    fixedSessionFetch?.noteExists,
    fixedSessionNumber,
    normalizedFixedPath,
    storage,
  ]);

  const handleSelectSession = useCallback(
    (sessionNumber: number) => setFixedSessionNumber(sessionNumber),
    [setFixedSessionNumber],
  );

  const handleTogglePin = useCallback(
    async (sessionNumber: number) => {
      await updateFixedSessionMeta(
        shell,
        storage,
        normalizedFixedPath,
        sessionNumber,
        (prev) => ({
          ...prev,
          createdAt: prev.createdAt ?? window.moment().toISOString(),
          pinned: !(prev.pinned ?? false),
        }),
      );
      await mutate();
    },
    [mutate, normalizedFixedPath, shell, storage],
  );

  const handleRenameSession = useCallback(
    async (session: FixedSessionSummary) => {
      const nextValue = await showTextInput({
        title: "セッション名を入力",
        placeholder: `Session ${session.sessionNumber}`,
        defaultValue: session.title,
      });

      if (nextValue === null) {
        return;
      }

      const trimmedValue = nextValue.trim();
      await updateFixedSessionMeta(
        shell,
        storage,
        normalizedFixedPath,
        session.sessionNumber,
        (prev) => {
          const nextMeta = {
            ...prev,
            createdAt: prev.createdAt ?? window.moment().toISOString(),
            pinned: prev.pinned ?? false,
          };

          if (
            trimmedValue.length === 0 ||
            trimmedValue === `Session ${session.sessionNumber}`
          ) {
            delete nextMeta.name;
          } else {
            nextMeta.name = trimmedValue;
          }

          return nextMeta;
        },
      );
      await mutate();
    },
    [mutate, normalizedFixedPath, shell, showTextInput, storage],
  );

  const handleDeleteSession = useCallback(
    async (session: FixedSessionSummary) => {
      if (session.sessionNumber === 1) {
        new Notice("Session 1 はベースセッションなので削除できません");
        return;
      }

      if (editingPost) {
        new Notice("編集中はセッションを削除できません");
        return;
      }

      const confirmed = await confirmDelete({
        title: "セッションを削除",
        message: `${session.title} とその投稿を削除しますか？`,
        confirmText: "削除",
      });
      if (!confirmed) {
        return;
      }

      const note = shell.getAbstractFileByPath(normalizedFixedPath);
      if (!(note instanceof TFile)) {
        new Notice("削除対象のノートを解決できませんでした");
        return;
      }

      const content = await shell.loadFile(note.path);
      const { nextContent, removed } = removeFixedSessionSection({
        content,
        insertAfter: settings.insertAfter,
        sessionNumber: session.sessionNumber,
      });
      if (!removed) {
        new Notice("削除対象のセッションが見つかりませんでした");
        return;
      }

      await shell.modifyVaultFile(note, nextContent);
      await removeFixedSessionMeta(
        shell,
        storage,
        note.path,
        session.sessionNumber,
      );

      if (fixedSessionNumber === session.sessionNumber) {
        const remainingSessionNumbers = sessions
          .map((item) => item.sessionNumber)
          .filter((sessionNumber) => sessionNumber !== session.sessionNumber)
          .sort((left, right) => left - right);
        const fallbackSessionNumber =
          remainingSessionNumbers.find(
            (sessionNumber) => sessionNumber > session.sessionNumber,
          ) ??
          remainingSessionNumbers.at(-1) ??
          1;
        setFixedSessionNumber(fallbackSessionNumber);
      }

      // 意図: current session 削除時は setFixedSessionNumber 内で旧sessionの下書きを退避し直すため、
      // 切替後に対象sessionの local state をもう一度消して削除結果を確定させる。
      storage?.remove(
        getInputStorageKey("fixed", note.path, session.sessionNumber),
      );
      storage?.remove(
        getDraftMetadataStorageKey("fixed", note.path, session.sessionNumber),
      );

      await mutate();
    },
    [
      confirmDelete,
      editingPost,
      fixedSessionNumber,
      mutate,
      normalizedFixedPath,
      sessions,
      settings.insertAfter,
      setFixedSessionNumber,
      shell,
      storage,
    ],
  );

  const handleOpenSessionMenu = useCallback(
    (session: FixedSessionSummary, event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const menu = new Menu();
      menu.addItem((item) =>
        item
          .setTitle(
            session.sessionNumber === fixedSessionNumber
              ? "現在のセッション"
              : "このセッションに切り替え",
          )
          .setIcon("check")
          .setDisabled(session.sessionNumber === fixedSessionNumber)
          .onClick(() => {
            handleSelectSession(session.sessionNumber);
          }),
      );
      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle(session.pinned ? "ピン留め解除" : "ピン留め")
          .setIcon("pin")
          .onClick(() => {
            void handleTogglePin(session.sessionNumber);
          }),
      );
      menu.addItem((item) =>
        item
          .setTitle("名前を変更")
          .setIcon("pencil")
          .onClick(() => {
            void handleRenameSession(session);
          }),
      );
      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setIcon("trash")
          .setWarning(true)
          .setDisabled(session.sessionNumber === 1 || editingPost != null)
          .onClick(() => {
            void handleDeleteSession(session);
          }),
      );
      menu.showAtMouseEvent(event.nativeEvent);
    },
    [
      editingPost,
      fixedSessionNumber,
      handleDeleteSession,
      handleRenameSession,
      handleSelectSession,
      handleTogglePin,
    ],
  );

  const resolveOrCreateNote = useCallback(async (): Promise<TFile | null> => {
    const existing = shell.getAbstractFileByPath(normalizedFixedPath);
    if (existing instanceof TFile) return existing;

    const created = await createNoteWithInsertAfter(shell, settings);
    return created instanceof TFile ? created : null;
  }, [createNoteWithInsertAfter, normalizedFixedPath, settings, shell]);

  const handleCreateSession = useCallback(async () => {
    if (editingPost) {
      new Notice("編集中は新しいセッションを作れません");
      return;
    }

    const insertAfter = settings.insertAfter.trim();
    if (!insertAfter) {
      new Notice("fixed session を使うには insertAfter 見出しの設定が必要です");
      return;
    }

    const note = await resolveOrCreateNote();
    if (!note) {
      new Notice("セッション用ノートを作成できませんでした");
      return;
    }

    let content = "";
    try {
      content = await shell.loadFile(note.path);
    } catch {
      content = "";
    }

    const existingSessions = buildFixedSessionSummaries({
      content,
      insertAfter,
      metaMap: await readFixedSessionMeta(shell, storage, note.path),
    });
    const nextSessionNumber =
      Math.max(1, ...existingSessions.map((s) => s.sessionNumber)) + 1;

    const { nextContent } = ensureFixedSessionHeading({
      content,
      insertAfter,
      sessionNumber: nextSessionNumber,
    });

    // 意図: session 見出しを先に永続化し、空 session でも一覧から消えないようにする。
    if (nextContent !== content) {
      await shell.modifyVaultFile(note, nextContent);
    }

    await updateFixedSessionMeta(
      shell,
      storage,
      note.path,
      nextSessionNumber,
      (prev) => ({
        ...prev,
        createdAt: prev.createdAt ?? window.moment().toISOString(),
        pinned: prev.pinned ?? false,
      }),
    );

    setFixedSessionNumber(nextSessionNumber);
    await mutate();
  }, [
    editingPost,
    mutate,
    resolveOrCreateNote,
    settings.insertAfter,
    setFixedSessionNumber,
    shell,
    storage,
  ]);

  return (
    <VStack className="h-full items-stretch gap-0 overflow-y-auto">
      <SidebarSectionHeader
        className="px-3 pt-2"
        rightAddon={
          !shouldShowLoading && fixedSessionFetch?.noteExists ? (
            <Text className="text-[11px] font-medium text-[var(--text-muted)]">
              {fixedSessionFetch.sessionCount}
            </Text>
          ) : null
        }
      >
        Sessions
      </SidebarSectionHeader>

      <SidebarTextButton
        className={cn(
          "mx-2 mt-3 !h-8 py-4 justify-center rounded-[var(--radius-s)]",
          "bg-[color-mix(in_srgb,var(--color-accent),transparent_88%)] text-[var(--color-accent)]",
          "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_80%)]",
        )}
        onClick={() => {
          void handleCreateSession();
        }}
      >
        <Text
          as="span"
          className="text-[length:var(--mfdi-panel-label-font-size)] font-medium text-[inherit]"
        >
          New Session
        </Text>
      </SidebarTextButton>

      {shouldShowLoading ? (
        <HStack className="justify-center py-6">
          <Spinner className="size-4 text-[var(--text-faint)] [animation-duration:0.8s]" />
        </HStack>
      ) : (
        <VStack className="items-stretch gap-0 pb-3 pt-1">
          <SessionGroup
            title="PINNED"
            sessions={groupedSessions.pinned}
            selectedSessionNumber={fixedSessionNumber}
            onSelect={handleSelectSession}
            onTogglePin={handleTogglePin}
            onOpenMenu={handleOpenSessionMenu}
          />
          <SessionGroup
            title="LAST 7 DAYS"
            sessions={groupedSessions.last7Days}
            selectedSessionNumber={fixedSessionNumber}
            onSelect={handleSelectSession}
            onTogglePin={handleTogglePin}
            onOpenMenu={handleOpenSessionMenu}
          />
          <SessionGroup
            title="OLDER"
            sessions={groupedSessions.older}
            selectedSessionNumber={fixedSessionNumber}
            onSelect={handleSelectSession}
            onTogglePin={handleTogglePin}
            onOpenMenu={handleOpenSessionMenu}
          />
        </VStack>
      )}
    </VStack>
  );
};

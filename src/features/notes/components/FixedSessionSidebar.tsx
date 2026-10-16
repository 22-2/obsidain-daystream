import { Menu } from "obsidian";
import type React from "react";
import { useCallback } from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import {
  SidebarSectionHeader,
  SidebarTextButton,
} from "src/features/workspace/components/layout/SidebarPrimitives";
import { Box, HStack, Spinner, Text, VStack } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { useFixedSessions } from "src/features/notes/hooks/useFixedSessions";
import type { FixedSessionSummary } from "src/features/notes/utils/fixed-session-utils";

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
  onOpenMenu: (session: FixedSessionSummary, event: React.MouseEvent<HTMLDivElement>) => void;
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
        "!h-auto min-h-[40px] whitespace-normal rounded-[var(--radius-s)] px-[var(--daystream-panel-item-padding-inline)] py-[var(--daystream-panel-item-padding-block)]",
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
                "truncate text-[length:var(--daystream-panel-label-font-size)] font-medium leading-[1.2]",
                isSelected && "text-[var(--color-accent)]",
              )}
            >
              {session.title}
            </Text>
          </HStack>
          <Box
            className="flex h-[var(--daystream-panel-item-height)] w-[var(--daystream-panel-item-height)] cursor-pointer items-center justify-center rounded-[var(--radius-s)] hover:bg-[var(--background-modifier-hover)]"
            onClick={handlePinClick}
          >
            <ObsidianIcon
              name="pin"
              size="0.95em"
              className={cn(
                session.pinned
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--text-faint)] opacity-60",
              )}
            />
          </Box>
        </HStack>
        <Text className="text-[length:var(--daystream-panel-meta-font-size)] leading-[1.25] text-[var(--text-muted)]">
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
  onOpenMenu: (session: FixedSessionSummary, event: React.MouseEvent<HTMLDivElement>) => void;
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
          <Text className="text-[length:var(--daystream-panel-meta-font-size)] font-medium text-[var(--text-muted)]">
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

export const FixedSessionSidebar: React.FC = () => {
  const {
    noteExists,
    sessionCount,
    shouldShowLoading,
    groupedSessions,
    fixedSessionNumber,
    editingPost,
    handleSelectSession,
    handleTogglePin,
    handleRenameSession,
    handleDeleteSession,
    handleCreateSession,
  } = useFixedSessions();

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

  return (
    <VStack className="h-full items-stretch gap-0 overflow-y-auto">
      <SidebarSectionHeader
        className="px-3 pt-2"
        rightAddon={
          !shouldShowLoading && noteExists ? (
            <Text className="text-[11px] font-medium text-[var(--text-muted)]">
              {sessionCount}
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
          className="text-[length:var(--daystream-panel-label-font-size)] font-medium text-[inherit]"
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

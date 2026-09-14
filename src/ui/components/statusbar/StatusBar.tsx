import type { FC } from "react";
import { Box, HStack, VStack } from "src/ui/components/primitives";
import { StatusBarDateNavigation } from "src/ui/components/statusbar/parts/StatusBarDateNavigation";
import { StatusBarHome } from "src/ui/components/statusbar/parts/StatusBarHome";

/**
 * 日付ビュー固有のナビゲーションを一覧上部に配置する。
 * 投稿入力は常設の InputArea が担当するため、ここには置かない。
 */
export const StatusBar: FC<{ showDateNavigation?: boolean }> = ({ showDateNavigation = true }) => {
  if (!showDateNavigation) return null;

  return (
    <Box className="mfdi-statusbar-controls relative my-1 w-full rounded-[var(--radius-m)] border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] !px-2 !py-1.5">
      <StatusBarHome />
      <VStack className="w-full !items-stretch !gap-1">
        <HStack className="min-h-6 w-full justify-center [&_.mfdi-statusbar-date-bar]:!border-0 [&_.mfdi-statusbar-date-bar]:!bg-transparent [&_.mfdi-statusbar-date-bar]:!p-0">
          <StatusBarDateNavigation />
        </HStack>
      </VStack>
    </Box>
  );
};

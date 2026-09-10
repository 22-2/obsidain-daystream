import type { FC } from "react";
import { Box, HStack, VStack } from "src/ui/components/primitives";
import { StatusBarDateNavigation } from "src/ui/components/statusbar/parts/StatusBarDateNavigation";
import { StatusBarPostInput } from "src/ui/components/statusbar/parts/StatusBarPostInput";

/**
 * 日付ビュー固有のナビゲーションと投稿導線を一覧上部に配置する。
 */
export const StatusBar: FC<{ showDateNavigation?: boolean }> = ({ showDateNavigation = true }) => {
  return (
    <Box className="mfdi-statusbar-controls relative my-1 w-full rounded-[var(--radius-m)] border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] !px-2 !py-1.5">
      <VStack className="w-full !items-stretch !gap-1">
        {showDateNavigation ? (
          <HStack className="min-h-6 w-full justify-center [&_.mfdi-statusbar-date-bar]:!border-0 [&_.mfdi-statusbar-date-bar]:!bg-transparent [&_.mfdi-statusbar-date-bar]:!p-0">
            <StatusBarDateNavigation />
          </HStack>
        ) : null}
        <HStack className="w-full justify-center">
          <StatusBarPostInput />
        </HStack>
      </VStack>
    </Box>
  );
};

import type { FC } from "react";
import { Box, HStack, VStack } from "src/ui/components/primitives";
import { StatusBarDateNavigation } from "src/ui/components/statusbar/parts/StatusBarDateNavigation";
import { StatusBarHome } from "src/ui/components/statusbar/parts/StatusBarHome";
import { StatusBarPostInput } from "src/ui/components/statusbar/parts/StatusBarPostInput";
import { StatusBarSearch } from "src/ui/components/statusbar/parts/StatusBarSearch";

/**
 * 検索と日付ナビゲーションを一覧上部に配置するコントロールバー。
 */
export const StatusBar: FC = () => {
  return (
    <Box className="mfdi-statusbar-controls relative my-1 w-full rounded-[var(--radius-m)] border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] !px-2 !py-1.5">
      <StatusBarHome />
      <VStack className="w-full !items-stretch !gap-1">
        <HStack className="min-h-7 w-full justify-center [&_.mfdi-statusbar-date-bar]:!border-0 [&_.mfdi-statusbar-date-bar]:!bg-transparent [&_.mfdi-statusbar-date-bar]:!p-0">
          <StatusBarDateNavigation />
        </HStack>
        <HStack className="w-full justify-center [&_.mfdi-statusbar-search]:!my-0 [&_.mfdi-statusbar-search]:!min-h-7 [&_.mfdi-statusbar-search]:!w-full [&_.mfdi-statusbar-search]:!max-w-none [&_.mfdi-statusbar-search]:!flex-1">
          <StatusBarSearch />
        </HStack>
        <HStack className="w-full justify-center">
          <StatusBarPostInput />
        </HStack>
      </VStack>
    </Box>
  );
};

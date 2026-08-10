import type { FC } from "react";
import { HStack, VStack } from "src/ui/components/primitives";
import { StatusBarDateNavigation } from "src/ui/components/statusbar/parts/StatusBarDateNavigation";
import { StatusBarSearch } from "src/ui/components/statusbar/parts/StatusBarSearch";

/**
 * 検索と日付ナビゲーションを一覧上部に配置するコントロールバー。
 */
export const StatusBar: FC = () => {
  return (
    <VStack className="mfdi-statusbar-controls mx-auto my-1 w-[22rem] max-w-[calc(100%_-_1rem)] !items-stretch !gap-1 rounded-[var(--radius-m)] border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] !px-2 !py-1.5">
      <HStack className="min-h-6 w-full justify-center [&_.mfdi-statusbar-date-bar]:!border-0 [&_.mfdi-statusbar-date-bar]:!bg-transparent [&_.mfdi-statusbar-date-bar]:!p-0">
        <StatusBarDateNavigation />
      </HStack>
      <HStack className="w-full justify-center [&_.mfdi-statusbar-search]:!my-0 [&_.mfdi-statusbar-search]:!min-h-7 [&_.mfdi-statusbar-search]:!w-full [&_.mfdi-statusbar-search]:!max-w-none [&_.mfdi-statusbar-search]:!flex-1">
        <StatusBarSearch />
      </HStack>
    </VStack>
  );
};

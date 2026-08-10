import type { FC } from "react";
import { HStack, VStack } from "src/ui/components/primitives";
import { StatusBarDateNavigation } from "src/ui/components/statusbar/parts/StatusBarDateNavigation";
import { StatusBarSearch } from "src/ui/components/statusbar/parts/StatusBarSearch";

/**
 * 検索と日付ナビゲーションを一覧上部に配置するコントロールバー。
 */
export const StatusBar: FC = () => {
  return (
    <VStack className="mfdi-statusbar-controls w-full items-center gap-1">
      <HStack className="w-full justify-center">
        <StatusBarDateNavigation />
      </HStack>
      <HStack className="w-full justify-center">
        <StatusBarSearch />
      </HStack>
    </VStack>
  );
};

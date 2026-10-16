import type { FC } from "react";
import { Box, HStack, VStack } from "src/core/ui/components/primitives";
import { StatusBarDateNavigation } from "src/features/workspace/components/statusbar/parts/StatusBarDateNavigation";

/**
 * 日付ビュー固有のナビゲーションを一覧上部に配置する。
 * 投稿入力は常設の InputArea が担当するため、ここには置かない。
 * 意図: 上のタブと囲みが重ならないよう、バー全体の背景・枠線を外し、入力欄だけを際立たせる。
 */
export const StatusBar: FC<{ showDateNavigation?: boolean }> = ({ showDateNavigation = true }) => {
  if (!showDateNavigation) return null;

  return (
    <Box className="daystream-statusbar-controls my-1 w-full !px-2 !py-1.5">
      <VStack className="w-full !items-stretch !gap-1">
        <HStack className="min-h-6 w-full justify-center [&_.daystream-statusbar-date-bar]:!border-0 [&_.daystream-statusbar-date-bar]:!bg-transparent [&_.daystream-statusbar-date-bar]:!p-0">
          <StatusBarDateNavigation />
        </HStack>
      </VStack>
    </Box>
  );
};

import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { Box, Flex } from "src/ui/components/primitives";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import type { Granularity } from "src/ui/types";

interface EmptyStateProps {
  granularity: Granularity;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ granularity }) => {
  return (
    <Flex className="flex-col items-center justify-center h-full gap-[var(--size-4-3)] text-[var(--text-faint)] select-none pointer-events-none">
      <ObsidianIcon name="feather" className="opacity-35" boxSize="2.5em" />
      <Box className="text-[length:var(--font-ui-smaller)] opacity-60 text-center">
        この{GRANULARITY_CONFIG[granularity].label}の記録はまだありません
      </Box>
    </Flex>
  );
};

import type { FC } from "react";
import { BaseLayout } from "src/ui/components/statusbar/layouts/BaseLayout";
import { StatusBarDateNavigation } from "src/ui/components/statusbar/parts/StatusBarDateNavigation";
import { StatusBarSearch } from "src/ui/components/statusbar/parts/StatusBarSearch";

/**
 * 検索と日付ナビゲーションを一覧上部に配置するコントロールバー。
 */
export const StatusBar: FC = () => {
  return (
    <BaseLayout
      className="mfdi-statusbar-controls"
      leftItems={<StatusBarSearch />}
      rightItems={<StatusBarDateNavigation />}
    />
  );
};

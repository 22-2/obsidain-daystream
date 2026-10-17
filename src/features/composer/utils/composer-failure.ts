import { reportError } from "src/core/error-report";

// 意図: composer の操作は呼び出し元で待たずに実行されるため、失敗はここで記録して利用者へ知らせる。
export function reportComposerFailure(context: string, notice: string): (error: unknown) => void {
  return (error: unknown) => {
    reportError({ context, error, notice });
  };
}

export const reportSubmitFailure = reportComposerFailure(
  "Failed to submit post from composer",
  "投稿できませんでした",
);

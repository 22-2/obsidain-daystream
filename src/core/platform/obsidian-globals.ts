import { moment } from "obsidian";
import type { App } from "obsidian";
import type MomentFn from "moment";

declare global {
  interface Window {
    app: App;
  }
}

type ObsidianRuntimeWindow = Pick<Window, "app" | "moment" | "activeDocument">;

/** Obsidian の実行環境で提供される型付きの window を返す。 */
function getObsidianWindow(): ObsidianRuntimeWindow {
  return window;
}

/** Obsidian が提供するグローバル依存を、このモジュールにまとめる。 */
// obsidian の型定義は moment を名前空間として宣言しており呼び出せない。実行時の値は moment 関数そのもの。
export const obsidianMoment = moment as unknown as typeof MomentFn;

/** Obsidian のアクティブドキュメントがあれば、そのフォーカス状態を返す。 */
export function isObsidianDocumentFocused(): boolean {
  const activeDocument = getObsidianWindow().activeDocument;
  return typeof activeDocument !== "undefined" && activeDocument.hasFocus();
}

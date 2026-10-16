import { DSTRStorage } from "src/core/storage";
import { registerFixedNoteRegistry } from "src/features/notes/register-fixed-note-registry";
import { registerFixedNoteViewLifecycle } from "src/features/notes/register-fixed-note-view-lifecycle";
import { registerTagIndexLifecycle } from "src/features/posts/register-tag-index-lifecycle";
import type { BuiltinMainContext } from "src/features/workspace/registration-context";
import {
  registerWorkspaceCommands,
  registerWorkspaceRibbon,
  registerWorkspaceViews,
} from "src/features/workspace/register-views-and-commands";

// 意図: 初期化順が機能要件そのものなので、一般化せず直列で明示する。
// main.onloadからsettings読込より先に呼び、workspace復元で必要なviewを先に登録する。
export function activateBuiltins(context: BuiltinMainContext, appId: string): void {
  const storage = new DSTRStorage(appId);

  registerWorkspaceViews(context);
  registerWorkspaceRibbon(context);
  registerWorkspaceCommands(context);

  registerTagIndexLifecycle(context, appId, storage);
  registerFixedNoteRegistry(context);
  registerFixedNoteViewLifecycle(context, storage);
}

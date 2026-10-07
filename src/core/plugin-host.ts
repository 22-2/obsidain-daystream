import type { EventRef, App } from "obsidian";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";

// 意図: host lifecycle APIだけを型にし、coreの登録処理がworkspace view型へ依存しないようにする。
export interface PluginLifecycleContext<TSettings> {
  app: App;
  shell: ObsidianAppShell;
  getSettings: () => TSettings;
  saveSettings: () => Promise<void>;
  register: (cb: () => unknown) => void;
  registerEvent: (eventRef: EventRef) => void;
}

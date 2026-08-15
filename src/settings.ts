import type { App } from "obsidian";
import { PluginSettingTab, debounce } from "obsidian";
import { createLogger } from "src/core/logger";
import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";
import type MFDIPlugin from "src/main";

const logger = createLogger("settings");

export type OpenInNewWindowMode = "disabled" | "always";

export interface Settings {
  postFormatOption: PostFormatOption;
  insertAfter: string;
  enabledCardView: boolean;
  autoToggleSidebar: boolean;
  debugMode: boolean;
  // When true, posts become scrollable only after being clicked (activated).
  allowEditingPastNotes: boolean;
  updateDateStrategy: "never" | "always" | "same_day";
  topics: Topic[];
  activeTopic: string;
  files: { path: string }[];
  fullScanIntervalHours?: number;
  // 「今何してる？」通知の間隔（分）。0 以下で無効。
  activityPromptIntervalMinutes?: number;
  editorExpansionMode: "full" | "default";
  // 投稿の編集をポップアウトウィンドウで開くタイミング
  openInNewWindowMode: OpenInNewWindowMode;
  // true のとき Ctrl+Enter で投稿を送信する。false のときはキーボードショートカットでの送信を無効化する
  ctrlEnterSends: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  postFormatOption: "Thino",
  insertAfter: "## Thino",
  enabledCardView: false,
  autoToggleSidebar: true,
  debugMode: false,
  allowEditingPastNotes: false,
  updateDateStrategy: "never",
  topics: [DEFAULT_TOPIC],
  activeTopic: "",
  files: [],
  fullScanIntervalHours: 24,
  activityPromptIntervalMinutes: 60,
  editorExpansionMode: "default",
  openInNewWindowMode: "disabled",
  ctrlEnterSends: false,
};

export const postFormatMap = {
  Thino: { type: "thino" },
} as const;
export type PostFormatOption = keyof typeof postFormatMap;

export class MFDISettingTab extends PluginSettingTab {
  plugin: MFDIPlugin;
  debouncedRerender = debounce(() => {
    this.plugin.rerenderView();
  }, 500);

  constructor(app: App, plugin: MFDIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // Obsidian 1.12.x typings still require the legacy abstract method.
  // Obsidian 1.13+ renders the non-empty declarative definitions instead.
  display(): void {}

  getSettingDefinitions() {
    return [
      {
        type: "page",
        name: "✏️ エディタ",
        items: [
          {
            name: "エディタの展開モード",
            desc: "エディタの展開モードを選択します。",
            control: {
              type: "dropdown",
              key: "editorExpansionMode",
              defaultValue: "default",
              options: {
                full: "フル展開",
                default: "デフォルトの展開",
              },
            },
          },
          {
            name: "新しいウィンドウで編集",
            desc: "投稿の編集をポップアウトウィンドウで開くタイミングを設定します。「常に」は常にポップアウトします。",
            control: {
              type: "dropdown",
              key: "openInNewWindowMode",
              defaultValue: "disabled",
              options: {
                disabled: "無効",
                always: "常に",
              },
            },
          },
          {
            name: "Ctrl+Enter で送信",
            desc: "有効にすると Ctrl+Enter で投稿を送信します。無効のときはキーボードショートカットでの送信を行いません。",
            control: {
              type: "toggle",
              key: "ctrlEnterSends",
            },
          },
        ],
      },
      {
        type: "page",
        name: "🖼️ 表示",
        items: [
          {
            name: "デバッグモード",
            desc: "有効にすると CodeMirror の余白補正処理の詳細ログを consola に出します。",
            control: {
              type: "toggle",
              key: "debugMode",
            },
          },
          {
            name: "サイドバーの自動開閉",
            desc: "有効にするとビュー幅に応じてサイドバーを自動で開閉します。無効にすると手動トグルだけで開閉します。",
            control: {
              type: "toggle",
              key: "autoToggleSidebar",
            },
          },
          {
            name: "リンクのカード表示",
            desc: "有効にすると投稿内のリンクをリッチなカード形式で表示します。",
            control: {
              type: "toggle",
              key: "enabledCardView",
            },
          },
        ],
      },
      {
        type: "page",
        name: "📝 投稿",
        items: [
          {
            name: "挿入位置 (文字列の後ろ)",
            desc: "指定した文字列がファイル内にある場合、その直後に投稿内容を挿入します。空の場合はファイルの末尾に挿入します。",
            control: {
              type: "text",
              key: "insertAfter",
              placeholder: "## MFDI",
            },
          },
          {
            name: "過去ノートの編集を許可",
            desc: "有効にすると、過去日のノートも編集でき、過去投稿の dim 表示も無効になります。",
            control: {
              type: "toggle",
              key: "allowEditingPastNotes",
            },
          },
          {
            name: "更新時の日時更新ストラテジ",
            desc: "編集で更新したときに日時を更新する条件を選択します。（「その日の間だけ」は日付が変わった時点で更新されなくなります）",
            control: {
              type: "dropdown",
              key: "updateDateStrategy",
              defaultValue: "never",
              options: {
                never: "常に更新しない（デフォルト）",
                always: "常に更新する",
                same_day: "その日の間だけ更新する",
              },
            },
          },
        ],
      },
      {
        type: "page",
        name: "🔍 スキャン",
        items: [
          {
            name: "全体フルスキャンの間隔",
            desc: "最後の大規模スキャンから指定した時間が経過している場合、起動時にフルスキャンを実行します。",
            control: {
              type: "dropdown",
              key: "fullScanIntervalHours",
              defaultValue: "24",
              options: {
                "0": "毎回起動時",
                "1": "1時間",
                "3": "3時間",
                "6": "6時間",
                "12": "12時間",
                "24": "24時間（デフォルト）",
              },
            },
          },
        ],
      },
      {
        type: "page",
        name: "🔔 通知",
        items: [
          {
            name: "活動確認通知",
            desc: "指定した間隔で「今何してる？」と通知します。通知をクリックするとコンポーザを開きます。",
            control: {
              type: "dropdown",
              key: "activityPromptIntervalMinutes",
              defaultValue: "60",
              options: {
                "0": "無効",
                "15": "15分",
                "30": "30分",
                "60": "1時間（デフォルト）",
                "120": "2時間",
                "240": "4時間",
              },
            },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    if (key === "fullScanIntervalHours") {
      return String(this.plugin.settings.fullScanIntervalHours ?? 24);
    }

    if (key === "activityPromptIntervalMinutes") {
      return String(this.plugin.settings.activityPromptIntervalMinutes ?? 60);
    }

    return this.plugin.settings[key as keyof Settings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    let nextValue = value;
    if (key === "fullScanIntervalHours" || key === "activityPromptIntervalMinutes") {
      const parsedValue = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsedValue)) return;
      nextValue = parsedValue;
    }

    if (!(key in this.plugin.settings)) return;

    this.plugin.settings = {
      ...this.plugin.settings,
      [key]: nextValue,
    } as Settings;
    await this.plugin.saveSettings();
    this.debouncedRerender();
    logger.debug("Setting updated", { key, value: nextValue });
  }

}

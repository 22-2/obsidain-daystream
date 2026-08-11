import type { App } from "obsidian";
import { PluginSettingTab, Setting, debounce } from "obsidian";
import { createLogger } from "src/core/logger";
import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";
import type MFDIPlugin from "src/main";

const logger = createLogger("settings");

export type OpenInNewWindowMode = "disabled" | "always";

type BooleanSettingKey = Exclude<
  {
    [K in keyof Settings]-?: Settings[K] extends boolean ? K : never;
  }[keyof Settings],
  undefined
>;

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

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const sections = [
      { id: "editor", label: "✏️ エディタ", render: this.addEditorSettings },
      { id: "display", label: "🖼️ 表示", render: this.addDisplaySettings },
      { id: "post", label: "📝 投稿", render: this.addPostSettings },
      { id: "scan", label: "🔍 スキャン", render: this.addScanSettings },
      {
        id: "notification",
        label: "🔔 通知",
        render: this.addNotificationSettings,
      },
    ] as const;

    const tabListEl = containerEl.createDiv({ cls: "mfdi-settings-tabs" });
    tabListEl.setAttribute("role", "tablist");
    tabListEl.setAttribute("aria-label", "設定セクション");
    const panelEl = containerEl.createDiv({ cls: "mfdi-settings-tab-panel" });
    panelEl.setAttribute("role", "tabpanel");

    const tabButtons = new Map<string, HTMLButtonElement>();
    const activate = (sectionId: (typeof sections)[number]["id"]): void => {
      const section = sections.find(({ id }) => id === sectionId);
      if (!section) return;

      for (const [id, button] of tabButtons) {
        const isActive = id === sectionId;
        button.toggleClass("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
        button.tabIndex = isActive ? 0 : -1;
      }

      panelEl.empty();
      panelEl.setAttribute("aria-labelledby", `mfdi-settings-tab-${section.id}`);
      new Setting(panelEl).setHeading().setName(section.label);
      section.render.call(this, panelEl);
    };

    for (const section of sections) {
      const button = tabListEl.createEl("button", {
        cls: "mfdi-settings-tabs__tab",
        text: section.label,
        attr: {
          id: `mfdi-settings-tab-${section.id}`,
          type: "button",
          role: "tab",
          "aria-controls": "mfdi-settings-tab-panel",
        },
      });
      button.addEventListener("click", () => activate(section.id));
      tabButtons.set(section.id, button);
    }

    panelEl.id = "mfdi-settings-tab-panel";
    activate(sections[0].id);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    this.plugin.settings = { ...this.plugin.settings, [key]: value };
    await this.plugin.saveSettings();
    logger.debug("Setting updated", { key, value });
  }

  private addToggleSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    key: BooleanSettingKey,
  ): void {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addToggle((tc) =>
        tc.setValue(this.plugin.settings[key]).onChange(async (value) => {
          await this.updateSetting(key, value);
          this.debouncedRerender();
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------------

  private addScanSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("全体フルスキャンの間隔")
      .setDesc(
        "最後の大規模スキャンから指定した時間が経過している場合、起動時にフルスキャンを実行します。",
      )
      .addDropdown((tc) =>
        tc
          .addOption("0", "毎回起動時")
          .addOption("1", "1時間")
          .addOption("3", "3時間")
          .addOption("6", "6時間")
          .addOption("12", "12時間")
          .addOption("24", "24時間（デフォルト）")
          .setValue(String(this.plugin.settings.fullScanIntervalHours ?? 24))
          .onChange(async (value) => {
            await this.updateSetting("fullScanIntervalHours", parseInt(value, 10));
            this.debouncedRerender();
          }),
      );
  }

  private addEditorSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("エディタの展開モード")
      .setDesc("エディタの展開モードを選択します。")
      .addDropdown((tc) =>
        tc
          .addOption("full", "フル展開")
          .addOption("default", "デフォルトの展開")
          .setValue(this.plugin.settings.editorExpansionMode)
          .onChange(async (value) => {
            await this.updateSetting(
              "editorExpansionMode",
              value as Settings["editorExpansionMode"],
            );
            this.debouncedRerender();
          }),
      );

    new Setting(containerEl)
      .setName("新しいウィンドウで編集")
      .setDesc(
        "投稿の編集をポップアウトウィンドウで開くタイミングを設定します。「常に」は常にポップアウトします。",
      )
      .addDropdown((tc) =>
        tc
          .addOption("disabled", "無効")
          .addOption("always", "常に")
          .setValue(this.plugin.settings.openInNewWindowMode ?? "disabled")
          .onChange(async (value) => {
            await this.updateSetting(
              "openInNewWindowMode",
              value as Settings["openInNewWindowMode"],
            );
            this.debouncedRerender();
          }),
      );

    this.addToggleSetting(
      containerEl,
      "Ctrl+Enter で送信",
      "有効にすると Ctrl+Enter で投稿を送信します。無効のときはキーボードショートカットでの送信を行いません。",
      "ctrlEnterSends",
    );
  }

  private addNotificationSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("活動確認通知")
      .setDesc(
        "指定した間隔で「今何してる？」と通知します。通知をクリックするとコンポーザを開きます。",
      )
      .addDropdown((tc) =>
        tc
          .addOption("0", "無効")
          .addOption("15", "15分")
          .addOption("30", "30分")
          .addOption("60", "1時間（デフォルト）")
          .addOption("120", "2時間")
          .addOption("240", "4時間")
          .setValue(String(this.plugin.settings.activityPromptIntervalMinutes ?? 60))
          .onChange(async (value) => {
            await this.updateSetting("activityPromptIntervalMinutes", parseInt(value, 10));
            this.debouncedRerender();
          }),
      );
  }

  private addDisplaySettings(containerEl: HTMLElement): void {
    this.addToggleSetting(
      containerEl,
      "デバッグモード",
      "有効にすると CodeMirror の余白補正処理の詳細ログを consola に出します。",
      "debugMode",
    );

    this.addToggleSetting(
      containerEl,
      "サイドバーの自動開閉",
      "有効にするとビュー幅に応じてサイドバーを自動で開閉します。無効にすると手動トグルだけで開閉します。",
      "autoToggleSidebar",
    );

    this.addToggleSetting(
      containerEl,
      "リンクのカード表示",
      "有効にすると投稿内のリンクをリッチなカード形式で表示します。",
      "enabledCardView",
    );
  }

  private addPostSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("挿入位置 (文字列の後ろ)")
      .setDesc(
        "指定した文字列がファイル内にある場合、その直後に投稿内容を挿入します。空の場合はファイルの末尾に挿入します。",
      )
      .addText((tc) =>
        tc
          .setPlaceholder("## MFDI")
          .setValue(this.plugin.settings.insertAfter)
          .onChange(async (value) => {
            await this.updateSetting("insertAfter", value);
            this.debouncedRerender();
          }),
      );

    this.addToggleSetting(
      containerEl,
      "過去ノートの編集を許可",
      "有効にすると、過去日のノートも編集でき、過去投稿の dim 表示も無効になります。",
      "allowEditingPastNotes",
    );

    new Setting(containerEl)
      .setName("更新時の日時更新ストラテジ")
      .setDesc(
        "編集で更新したときに日時を更新する条件を選択します。（「その日の間だけ」は日付が変わった時点で更新されなくなります）",
      )
      .addDropdown((tc) =>
        tc
          .addOption("never", "常に更新しない（デフォルト）")
          .addOption("always", "常に更新する")
          .addOption("same_day", "その日の間だけ更新する")
          .setValue(this.plugin.settings.updateDateStrategy)
          .onChange(async (value) => {
            await this.updateSetting("updateDateStrategy", value as Settings["updateDateStrategy"]);
            this.debouncedRerender();
          }),
      );
  }
}

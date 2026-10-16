import { unpatchToggleSourceCommand } from "@22-2/obsidian-magical-editor";
import type { WorkspaceLeaf } from "obsidian";
import { Notice, Plugin } from "obsidian";
import { activateBuiltins } from "src/features/workspace/activate-builtins";
import type { BuiltinMainContext } from "src/features/workspace/registration-context";
import { setConsolaLevel } from "src/core/logger";
import { createFixedNoteFromInput } from "src/core/note-source";
import type { Topic } from "src/core/topic";
import { WorkerClient } from "src/core/db/worker-client";
import { extension as daystreamBottomPaddingExtension } from "src/features/composer/extensions/bottom-padding";
import { findExistingDaystreamLeaf } from "src/features/notes/extensions/fixed-note-view-extension";
import {
  ACTIVITY_PROMPT_TEXT,
  createActivityPromptNotificationScheduler,
  resolveActivityPromptIntervalMs,
  type ActivityPromptNotificationScheduler,
} from "src/features/activity-prompt/notification";
import type { Settings } from "src/core/domain/settings";
import {
  DEFAULT_SETTINGS,
  normalizeCtrlEnterSendMode,
} from "src/core/domain/settings";
import { DaystreamSettingTab } from "src/features/settings/DaystreamSettingTab";
import { watchElectronPowerState } from "src/core/platform/electron-power";
import { restoreAndFocusElectronWindow } from "src/core/platform/electron-window";
import { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { showInputModal } from "src/features/composer/modals/InputModal";
import { TopicManagerModal } from "src/features/notes/modals/TopicManagerModal";
import { DaystreamEditorView } from "src/features/composer/views/DaystreamEditorView";
import { DaystreamView, VIEW_TYPE_DAYSTREAM } from "src/features/workspace/views/DaystreamView";
import type { DaystreamViewState } from "src/features/workspace/views/state";
import { createFixedNoteViewState, DEFAULT_DAYSTREAM_VIEW_STATE } from "src/features/workspace/views/state";

export default class DaystreamPlugin extends Plugin {
  shell: ObsidianAppShell;
  declare settings: Settings;
  view?: DaystreamView;
  private readonly views = new Set<DaystreamView>();
  private activityPromptScheduler: ActivityPromptNotificationScheduler | null = null;
  private activityPromptNotificationsReady = false;
  private activityPromptNotificationsPaused = false;
  private activityPromptComposerPromise: Promise<void> | null = null;

  private createBootstrapSettings(): Settings {
    return {
      ...DEFAULT_SETTINGS,
      topics: [...DEFAULT_SETTINGS.topics],
      files: [...DEFAULT_SETTINGS.files],
    };
  }

  private async initializeWorker(): Promise<void> {
    // 意図: Worker 初期化は重くなりうるため、コマンド/ビュー登録をブロックしない。
    // lazy ロード直後に command wrapper から実コマンドへ到達できることを優先する。
    try {
      await WorkerClient.initialize({ appId: this.shell.getAppId() });
    } catch (e) {
      console.error("Failed to initialize DB worker:", e);
    }
  }

  async onload() {
    this.shell = new ObsidianAppShell(this.app);
    // 意図: workspace 復元は plugin onload の await を待たずに進むケースがあるため、
    // custom view の登録に必要な settings はまず default で即時に立てる。
    this.settings = this.createBootstrapSettings();

    this.registerEditorExtension(daystreamBottomPaddingExtension);

    this.addSettingTab(new DaystreamSettingTab(this.app, this));

    // 意図: workspace 復元時に custom view/type 変換が既に登録済みでないと、
    // 起動直後の leaf 復元で mfdi-view を解決できず、固定ノートタブを取りこぼす。
    this.activateBuiltinRegistry();

    await this.loadSettings();
    setConsolaLevel(this.settings.debugMode ? 4 : 0);
    this.rerenderView();

    this.activityPromptNotificationsReady = true;
    this.register(() => this.stopActivityPromptNotifications());
    const stopWatchingPowerState = watchElectronPowerState({
      onInactive: () => {
        // ロック／スリープ中に発生した通知を復帰直後へ持ち越さないため、
        // タイマーと表示中の通知をその場で停止する。
        this.activityPromptNotificationsPaused = true;
        this.stopActivityPromptNotifications();
      },
      onActive: () => {
        this.activityPromptNotificationsPaused = false;
        this.restartActivityPromptNotifications();
      },
    });
    this.register(stopWatchingPowerState);
    this.restartActivityPromptNotifications();

    this.app.workspace.onLayoutReady(() => {
      // Worker 初期化は非同期に開始（失敗はログのみ）。
      void this.initializeWorker();
    });
  }

  // ---------------------------------------------------------------------------
  // コマンド処理
  // ---------------------------------------------------------------------------

  private async createAndOpenFixedNote() {
    const folder = this.app.vault.config.newFileFolderPath || "/";

    const name = await showInputModal(this.app, {
      title: "固定ノートの名前を入力",
      placeholder: "Untitled",
    });
    if (name === null) return;

    const fixedNote = await createFixedNoteFromInput(this.shell, folder, name);

    this.settings.files = [...this.settings.files, { path: fixedNote.path }];
    await this.saveSettings();

    const leaf = await this.attachDaystreamView(createFixedNoteViewState(fixedNote.path));
    if (leaf) this.app.workspace.revealLeaf(leaf);
  }

  // ---------------------------------------------------------------------------
  // ビュー管理
  // ---------------------------------------------------------------------------

  private activateBuiltinRegistry() {
    // 意図: 登録処理は activateBuiltins へ委譲し、main 側は入力(context)だけ作る。
    // こうしておくと初期化の責務境界が明確で、plugin 固有 API の見通しを保てる。
    const context: BuiltinMainContext = {
      app: this.app,
      shell: this.shell,
      getSettings: () => this.settings,
      saveSettings: () => this.saveSettings(),
      register: (cb) => this.register(cb),
      registerEvent: (eventRef) => this.registerEvent(eventRef),
      registerView: (type, viewCreator) => this.registerView(type, viewCreator),
      addRibbonIcon: (icon, title, callback) => this.addRibbonIcon(icon, title, callback),
      addCommand: (command) => this.addCommand(command),
      getDaystreamSubmitCallback: () => this.getActiveDaystreamView()?.actionDelegates.onSubmit,
      getDaystreamInputSnapshot: () =>
        this.getActiveDaystreamView()?.actionDelegates.onGetInputSnapshot?.() ?? "",
      createDaystreamView: (leaf) => {
        const view = new DaystreamView(leaf, this.settings, async (mode) => {
          this.settings.editorExpansionMode = mode;
          await this.saveSettings();
          this.rerenderView();
        });
        this.views.add(view);
        this.view = view;
        this.setupViewCallbacks(view);
        return view;
      },
      createDaystreamEditorView: (leaf) => new DaystreamEditorView(leaf, this.settings),
      createAndOpenFixedNote: () => this.createAndOpenFixedNote(),
      attachDaystreamView: (state, preferredLeaf) => this.attachDaystreamView(state, preferredLeaf),
    };

    activateBuiltins(context, this.shell.getAppId());
  }

  // leaf 探索込みの setViewState ラッパー。同一条件の leaf が既に存在する場合は再利用する。
  async attachDaystreamView(
    state: Partial<DaystreamViewState> = DEFAULT_DAYSTREAM_VIEW_STATE,
    preferredLeaf?: WorkspaceLeaf,
  ): Promise<WorkspaceLeaf | undefined> {
    const mergedState = { ...DEFAULT_DAYSTREAM_VIEW_STATE, ...state };
    const existing = findExistingDaystreamLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_DAYSTREAM),
      state,
    );
    const targetLeaf = preferredLeaf ?? existing ?? this.app.workspace.getLeaf(false);

    await targetLeaf.setViewState({
      type: VIEW_TYPE_DAYSTREAM,
      active: true,
      state: mergedState,
    });

    return targetLeaf;
  }

  private getActiveDaystreamView(): DaystreamView | undefined {
    const activeView = this.app.workspace.activeLeaf?.view;
    if (!activeView) return undefined;

    const viewType = activeView.getViewType();
    if (viewType !== VIEW_TYPE_DAYSTREAM) return undefined;
    return activeView as DaystreamView;
  }

  /**
   * DaystreamView のコールバックを設定する
   */
  private setupViewCallbacks(view: DaystreamView) {
    view.actionDelegates.onTopicSaveRequested = async (topicId: string) => {
      this.settings.activeTopic = topicId;
      await this.saveSettings();
    };

    view.actionDelegates.onOpenTopicManager = () => {
      const modal = new TopicManagerModal(
        this.app,
        this.settings.topics,
        this.settings.activeTopic,
        async (topics: Topic[], activeTopic: string) => {
          this.settings.topics = topics;
          this.settings.activeTopic = activeTopic;
          await this.saveSettings();
          view.actionDelegates.onChangeTopic?.(activeTopic);
        },
      );
      modal.open();
    };
  }

  // ---------------------------------------------------------------------------
  // 設定管理
  // ---------------------------------------------------------------------------

  private stopActivityPromptNotifications(): void {
    this.activityPromptScheduler?.stop();
    this.activityPromptScheduler = null;
  }

  private restartActivityPromptNotifications(): void {
    this.stopActivityPromptNotifications();

    if (this.activityPromptNotificationsPaused) return;

    const intervalMs = resolveActivityPromptIntervalMs(this.settings.activityPromptIntervalMinutes);
    if (intervalMs === null) return;

    this.activityPromptScheduler = createActivityPromptNotificationScheduler({
      intervalMs,
      onClick: () => this.openActivityPromptComposer(),
    });
    this.activityPromptScheduler.start();
  }

  private openActivityPromptComposer(): void {
    restoreAndFocusElectronWindow();
    if (this.activityPromptComposerPromise) return;

    new Notice(ACTIVITY_PROMPT_TEXT);
    const composerPromise = this.showActivityPromptComposer().catch((error) => {
      console.error("Failed to open activity prompt composer:", error);
      new Notice("コンポーザを開けませんでした");
    });
    this.activityPromptComposerPromise = composerPromise;
    void composerPromise.finally(() => {
      if (this.activityPromptComposerPromise === composerPromise) {
        this.activityPromptComposerPromise = null;
      }
    });
  }

  private async showActivityPromptComposer(): Promise<void> {
    const leaf = await this.attachDaystreamView({});
    if (!leaf) return;

    this.app.workspace.revealLeaf(leaf);

    await (leaf.view as DaystreamView).waitForReactReady();
    restoreAndFocusElectronWindow();
    (leaf.view as DaystreamView).actionDelegates.onOpenComposer?.();
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    setConsolaLevel(this.settings.debugMode ? 4 : 0);
    if (this.activityPromptNotificationsReady) {
      this.restartActivityPromptNotifications();
    }
  }

  async loadSettings(): Promise<void> {
    // 意図: 初回起動では data.json がなく loadData() が null を返すため、空の設定として扱う。
    const currentSettings = ((await this.loadData()) ?? {}) as Partial<Settings>;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...currentSettings,
      // 旧 boolean 値が残っていても、設定 UI とエディタが常に同じ2択を扱うよう正規化する。
      ctrlEnterSends: normalizeCtrlEnterSendMode(currentSettings.ctrlEnterSends),
    };
  }

  rerenderView() {
    for (const view of this.views) {
      view.updateSettings(this.settings);
    }
  }

  onunload(): void {
    this.stopActivityPromptNotifications();
    this.views.clear();
    unpatchToggleSourceCommand();
  }
}

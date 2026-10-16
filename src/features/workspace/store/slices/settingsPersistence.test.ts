// @vitest-environment jsdom
import type { DaystreamStorage } from "src/core/storage";
import type { Settings } from "src/core/domain/settings";
import { CONTENT_VIEW, DISPLAY_MODE, MAIN_VIEW, STORAGE_KEYS } from "src/features/workspace/config/constants";
import { resolveInitialSettingsState } from "src/features/workspace/store/slices/settingsPersistence";
import { beforeEach, describe, expect, it } from "vitest";

describe("main view persistence", () => {
  let storage: DaystreamStorage;
  let values: Map<string, unknown>;

  beforeEach(() => {
    values = new Map();
    storage = {
      get: <T,>(key: string, defaultValue: T): T =>
        (values.has(key) ? values.get(key) : defaultValue) as T,
    } as DaystreamStorage;
  });

  it("旧 contentView から mainView を移行する", () => {
    values.set(STORAGE_KEYS.CONTENT_VIEW, CONTENT_VIEW.INSIGHTS);

    const state = resolveInitialSettingsState({ activeTopic: "" } as Settings, storage, "periodic", null);

    expect(state.mainView).toBe(MAIN_VIEW.INSIGHTS);
    expect(state.contentView).toBe(CONTENT_VIEW.INSIGHTS);
  });

  it("保存済み mainView を正として古い表示条件を正規化する", () => {
    values.set(STORAGE_KEYS.MAIN_VIEW, MAIN_VIEW.SEARCH);
    values.set(STORAGE_KEYS.CONTENT_VIEW, CONTENT_VIEW.INSIGHTS);
    values.set(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    values.set(STORAGE_KEYS.AS_TASK, true);

    const state = resolveInitialSettingsState({ activeTopic: "" } as Settings, storage, "periodic", null);

    expect(state).toMatchObject({
      mainView: MAIN_VIEW.SEARCH,
      contentView: CONTENT_VIEW.TIMELINE,
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: false,
    });
  });
});

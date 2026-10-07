import { createLayoutSlice } from "src/features/workspace/store/slices/layoutSlice";
import { createNavigationSlice } from "src/features/workspace/store/slices/navigationSlice";
import { resolveInitialSettingsState } from "src/features/workspace/store/slices/settingsPersistence";
import { DEFAULT_VIEW_STATE } from "src/features/workspace/store/slices/settingsDefaults";
import { isPastDateReadOnly, isViewReadOnly } from "src/features/workspace/store/slices/settingsPredicates";
import type { MFDIStore, SettingsSlice } from "src/features/workspace/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

/**
 * Compatibility boundary for the settings store.
 *
 * The public settings API remains flat for existing consumers, while the
 * implementation is split by responsibility into navigation and layout.
 */
export const createSettingsSlice: StateCreator<MFDIStore, [], [], SettingsSlice> = (
  set,
  get,
  store,
) => ({
  ...createNavigationSlice(set, get, store),
  ...createLayoutSlice(set, get, store),

  hydrateSettingsState: () => {
    const { pluginSettings, storage, viewNoteMode, file } = get();
    if (!pluginSettings || !storage) return;
    set(resolveInitialSettingsState(pluginSettings, storage, viewNoteMode, file));
  },
});

// Keep these exports stable for existing utilities and tests.
export { DEFAULT_VIEW_STATE, isPastDateReadOnly, isViewReadOnly };

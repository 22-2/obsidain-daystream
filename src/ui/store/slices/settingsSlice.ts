import { createLayoutSlice } from "src/ui/store/slices/layoutSlice";
import { createNavigationSlice } from "src/ui/store/slices/navigationSlice";
import { resolveInitialSettingsState } from "src/ui/store/slices/settingsPersistence";
import { DEFAULT_VIEW_STATE } from "src/ui/store/slices/settingsDefaults";
import { isPastDateReadOnly, isViewReadOnly } from "src/ui/store/slices/settingsPredicates";
import type { MFDIStore, SettingsSlice } from "src/ui/store/slices/types";
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

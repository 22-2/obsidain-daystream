type ElectronPowerStateEvent =
  | "lock-screen"
  | "unlock-screen"
  | "suspend"
  | "resume"
  | "user-did-resign-active"
  | "user-did-become-active";

export interface ElectronPowerMonitorLike {
  on: (event: ElectronPowerStateEvent, listener: () => void) => unknown;
  removeListener: (event: ElectronPowerStateEvent, listener: () => void) => unknown;
}

interface ElectronModuleLike {
  powerMonitor?: ElectronPowerMonitorLike;
  remote?: ElectronRemoteLike;
}

interface ElectronRemoteLike {
  powerMonitor?: ElectronPowerMonitorLike;
  require?: (moduleName: string) => unknown;
}

type ElectronRequire = (moduleName: string) => unknown;

function getElectronRequire(): ElectronRequire | null {
  const runtime = globalThis as typeof globalThis & {
    require?: ElectronRequire;
    window?: {
      require?: ElectronRequire;
      electron?: ElectronModuleLike;
    };
  };

  return runtime.window?.require ?? runtime.require ?? null;
}

function getElectronPowerMonitor(): ElectronPowerMonitorLike | undefined {
  const runtime = globalThis as typeof globalThis & {
    window?: { electron?: ElectronModuleLike };
  };
  const requireElectron = getElectronRequire();

  try {
    const electron =
      runtime.window?.electron ??
      (requireElectron?.("electron") as ElectronModuleLike | undefined);
    if (!electron) return undefined;
    if (electron.powerMonitor) return electron.powerMonitor;

    if (electron.remote?.powerMonitor) return electron.remote.powerMonitor;

    // Obsidian / e2e 環境によっては powerMonitor が renderer から直接公開されず、
    // @electron/remote 経由で main process のモジュールとして取得できる。
    const remote =
      electron.remote ??
      (requireElectron?.("@electron/remote") as ElectronRemoteLike | undefined);
    return (remote?.require?.("electron") as ElectronModuleLike | undefined)?.powerMonitor;
  } catch {
    return undefined;
  }
}

export interface ElectronPowerStateWatcherOptions {
  powerMonitor?: ElectronPowerMonitorLike;
  onInactive: () => void;
  onActive: () => void;
}

/**
 * Watch system states that make desktop notifications unusable or invisible.
 *
 * Display-only sleep is not exposed by Electron's cross-platform API. Locking,
 * system suspend, and inactive login sessions are the reliable states we can
 * observe here without adding an OS-specific native dependency.
 */
export function watchElectronPowerState(
  options: ElectronPowerStateWatcherOptions,
): () => void {
  const powerMonitor = options.powerMonitor ?? getElectronPowerMonitor();
  if (!powerMonitor) return () => undefined;

  const inactiveEvents: ElectronPowerStateEvent[] = [
    "lock-screen",
    "suspend",
    "user-did-resign-active",
  ];
  const activeEvents: ElectronPowerStateEvent[] = [
    "unlock-screen",
    "resume",
    "user-did-become-active",
  ];
  const inactiveListeners = inactiveEvents.map((event) => {
    const listener = options.onInactive;
    powerMonitor.on(event, listener);
    return { event, listener };
  });
  const activeListeners = activeEvents.map((event) => {
    const listener = options.onActive;
    powerMonitor.on(event, listener);
    return { event, listener };
  });

  return () => {
    [...inactiveListeners, ...activeListeners].forEach(({ event, listener }) => {
      powerMonitor.removeListener(event, listener);
    });
  };
}

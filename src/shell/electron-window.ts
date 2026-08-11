export interface ElectronWindowLike {
  isMinimized?: () => boolean;
  restore?: () => void;
  show?: () => void;
  focus?: () => void;
}

interface ElectronRemoteLike {
  getCurrentWindow?: () => ElectronWindowLike;
}

interface ElectronModuleLike {
  remote?: ElectronRemoteLike;
}

type ElectronRequire = (moduleName: string) => unknown;

function getElectronRequire(): ElectronRequire | null {
  const runtime = globalThis as typeof globalThis & {
    require?: ElectronRequire;
    window?: { require?: ElectronRequire };
  };

  return runtime.window?.require ?? runtime.require ?? null;
}

function getCurrentElectronWindow(): ElectronWindowLike | null {
  const requireElectron = getElectronRequire();
  if (!requireElectron) return null;

  try {
    const electron = requireElectron("electron") as ElectronModuleLike;
    let remote = electron.remote;

    // Obsidian / e2e 環境によっては remote が electron 本体ではなく、
    // @electron/remote として公開されている場合がある。
    if (!remote) {
      remote = requireElectron("@electron/remote") as ElectronRemoteLike;
    }

    return remote?.getCurrentWindow?.() ?? null;
  } catch {
    return null;
  }
}

export function restoreAndFocusElectronWindow(
  resolveWindow: () => ElectronWindowLike | null = getCurrentElectronWindow,
): boolean {
  try {
    const currentWindow = resolveWindow();
    if (!currentWindow) return false;

    if (currentWindow.isMinimized?.()) {
      currentWindow.restore?.();
    }
    currentWindow.show?.();
    currentWindow.focus?.();
    return true;
  } catch {
    return false;
  }
}

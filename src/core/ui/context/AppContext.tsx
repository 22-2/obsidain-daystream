import type { App } from "obsidian";
import type { FC, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { DSTRStorage } from "src/core/storage";
import type { Settings } from "src/core/domain/settings";
import { ObsidianAppShell } from "src/core/platform/obsidian-shell";

interface AppContextValue {
  shell: ObsidianAppShell;
  storage: DSTRStorage;
  settings: Settings;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppContextProvider");
  }
  return ctx;
}

interface AppContextProviderProps {
  app: App;
  settings: Settings;
  children: ReactNode;
}

export const AppContextProvider: FC<AppContextProviderProps> = ({
  app,
  settings,
  children,
}) => {
  const shell = useMemo(() => new ObsidianAppShell(app), [app]);
  const storage = useMemo(() => new DSTRStorage(shell.getRawApp()), [shell]);
  const value = useMemo<AppContextValue>(
    // 一般ロジックから raw app を見えなくして、依存の漏れを型で止める。
    () => ({ shell, storage, settings }),
    [shell, storage, settings],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

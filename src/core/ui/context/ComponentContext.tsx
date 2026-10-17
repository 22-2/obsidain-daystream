import type { Component } from "obsidian";
import type { FC, ReactNode } from "react";
import { createContext, useContext } from "react";

const ComponentContext = createContext<Component | null>(null);

type ComponentGuard<T extends Component> = (component: Component) => component is T;

export function useObsidianComponent(): Component;
export function useObsidianComponent<T extends Component>(guard: ComponentGuard<T>): T;
export function useObsidianComponent<T extends Component>(
  guard?: ComponentGuard<T>,
): Component | T {
  const ctx = useContext(ComponentContext);
  if (!ctx) {
    throw new Error("useObsidianComponent must be used within ComponentContextProvider");
  }
  if (guard && !guard(ctx)) {
    throw new Error("ComponentContext contains an unexpected Obsidian host");
  }
  return ctx;
}

interface ComponentContextProviderProps {
  component: Component;
  children: ReactNode;
}

export const ComponentContextProvider: FC<ComponentContextProviderProps> = ({
  component,
  children,
}) => {
  return <ComponentContext.Provider value={component}>{children}</ComponentContext.Provider>;
};

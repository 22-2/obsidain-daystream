import type { Component } from "obsidian";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const ComponentContext = createContext<Component | null>(null);

export function useObsidianComponent(): Component {
  const ctx = useContext(ComponentContext);
  if (!ctx) {
    throw new Error("useObsidianComponent must be used within ComponentContextProvider");
  }
  return ctx;
}

interface ComponentContextProviderProps {
  component: Component;
  children: ReactNode;
}

export const ComponentContextProvider: React.FC<ComponentContextProviderProps> = ({
  component,
  children,
}) => {
  return <ComponentContext.Provider value={component}>{children}</ComponentContext.Provider>;
};

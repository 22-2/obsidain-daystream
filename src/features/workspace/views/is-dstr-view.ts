import type { Component } from "obsidian";
import { VIEW_TYPE_DSTR } from "src/core/view-types";
import type { DSTRView } from "src/features/workspace/views/DSTRView";

export function isDSTRView(component: Component): component is DSTRView {
  const getViewType: unknown = Reflect.get(component, "getViewType");
  const getState: unknown = Reflect.get(component, "getState");
  const getExternalStateRevision: unknown = Reflect.get(component, "getExternalStateRevision");

  return (
    typeof getViewType === "function" &&
    Reflect.apply(getViewType, component, []) === VIEW_TYPE_DSTR &&
    typeof getState === "function" &&
    typeof getExternalStateRevision === "function"
  );
}

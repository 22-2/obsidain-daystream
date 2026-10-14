import { expect } from "obsidian-e2e-toolkit";
import type { Locator } from "@playwright/test";
import type { ObsidianAPI, VaultOptions } from "obsidian-e2e-toolkit";
import { fileURLToPath } from "node:url";
import type { MFDIView } from "src/features/workspace/views/MFDIView";

export const PLUGIN_ID = "mobile-first-daily-interface";
export const MFDI_VIEW_TYPE = "mfdi-view";
export const OPEN_VIEW_COMMAND = PLUGIN_ID + ":mfdi-open-view";
export const MFDI_LEAF = '.workspace-leaf-content[data-type="mfdi-view"]';
export const LIVE_EDITOR = ".mfdi-input-area .cm-content";

// The built plugin is read from the repository's dist/ folder.
const PLUGIN_DIR = fileURLToPath(new URL("../dist", import.meta.url));

/** Vault options for MFDI specs: a fresh vault with the built plugin, plus any spec-specific options. */
export function mfdiVaultOptions(options: Partial<VaultOptions> = {}): Partial<VaultOptions> {
  return { fresh: true, ...options, plugins: [{ path: PLUGIN_DIR }] };
}

/** Opens the MFDI view with its command and returns the view's leaf. */
export async function openMfdiView(obsidian: ObsidianAPI): Promise<Locator> {
  await obsidian.command(OPEN_VIEW_COMMAND);
  await obsidian.waitForViewType(MFDI_VIEW_TYPE);
  return obsidian.page.locator(MFDI_LEAF);
}

/** Creates an empty host note and opens it, so the MFDI view has a note tab beside it. */
export async function openHostNote(obsidian: ObsidianAPI, filePath: string): Promise<void> {
  await obsidian.createNote(filePath, "");
  await obsidian.open(filePath);
}

/** Hides the MFDI navigator and insight panels, then collapses Obsidian's own sidebars. */
export async function collapseMfdiSidebars(obsidian: ObsidianAPI): Promise<void> {
  const page = obsidian.page;
  await page.getByLabel("ナビゲーターを切り替え", { exact: true }).click();
  await page.getByLabel("インサイトを切り替え", { exact: true }).click();
  await obsidian.collapseSidebars();
}

/** Reads the live editor text through the MFDI view's test delegate. */
export function getLiveEditorDelegateContent(obsidian: ObsidianAPI): Promise<string> {
  return obsidian.evaluateApp(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }
    const delegates = (leaf.view as MFDIView).actionDelegates;
    if (!delegates.onGetLiveEditorContentForTesting) {
      throw new Error("onGetLiveEditorContentForTesting is not ready");
    }
    return delegates.onGetLiveEditorContentForTesting!();
  });
}

/** Sets the live editor text through the MFDI view's test delegate and waits until the delegate reports it. */
export async function setLiveEditorDelegateContent(obsidian: ObsidianAPI, text: string): Promise<void> {
  await obsidian.evaluateApp((content) => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }
    if (!(leaf.view as MFDIView).actionDelegates.onSetLiveEditorContentForTesting) {
      throw new Error("onSetLiveEditorContentForTesting is not ready");
    }
    (leaf.view as MFDIView).actionDelegates.onSetLiveEditorContentForTesting!(content);
  }, text);
  await expect.poll(() => getLiveEditorDelegateContent(obsidian)).toBe(text);
}

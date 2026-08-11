import type { App, Component } from "obsidian";
import { Modal } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { DraftListManager } from "src/ui/components/DraftListManager";
import { AppContextProvider } from "src/ui/context/AppContext";
import { ComponentContextProvider } from "src/ui/context/ComponentContext";
import type { AppStoreApi } from "src/ui/store/appStore";
import { AppStoreProvider } from "src/ui/store/appStore";
export class DraftListModal extends Modal {
  private root: Root | null = null;
  private store: AppStoreApi;

  constructor(app: App, store: AppStoreApi) {
    super(app);
    this.store = store;
    this.modalEl.addClass("mfdi-draft-list-modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.root = createRoot(contentEl);
    this.root.render(
      <AppContextProvider app={this.app} settings={this.store.getState().pluginSettings!}>
        <ComponentContextProvider component={this as unknown as Component}>
          <AppStoreProvider store={this.store}>
            <DraftListManager onClose={() => this.close()} />
          </AppStoreProvider>
        </ComponentContextProvider>
      </AppContextProvider>,
    );
  }

  onClose() {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}

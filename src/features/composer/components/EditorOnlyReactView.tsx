import type { App, ItemView } from "obsidian";
import { useLayoutEffect, useRef } from "react";
import type { Settings } from "src/core/domain/settings";
import { PopoutInputArea } from "src/features/composer/components/inputarea/PopoutInputArea";
import { AppContextProvider, useAppContext } from "src/core/ui/context/AppContext";
import { ComponentContextProvider } from "src/core/ui/context/ComponentContext";
import { EditorRefsProvider } from "src/features/composer/context/EditorRefsContext";
import { PostsProvider } from "src/features/posts/hooks/usePosts";
import { useAppStoreInitialization } from "src/features/workspace/hooks/internal/useAppStoreInitialization";
import {
  AppStoreProvider,
  createAppStore,
  useRequiredAppStore,
  type AppStoreApi,
} from "src/features/workspace/store/appStore";
import { reconstructEditingPost } from "src/features/composer/store/slices/editorSlice";
import type { DaystreamEditorViewState } from "src/features/composer/views/DaystreamEditorView";

// 意図: Paper Cut など他プラグインのエディタビューからも再利用できるよう、
// view の型を DaystreamEditorView から ItemView に緩める。
export const EditorOnlyReactView = ({
  app,
  settings,
  view,
  initialState,
}: {
  app: App;
  settings: Settings;
  view: ItemView;
  initialState: DaystreamEditorViewState | null;
}) => {
  // 意図: popout ウィンドウは別 JS コンテキストのため、メインビューの store を共有できない。
  // ここで独立した store を生成して providers に渡す。
  const storeRef = useRef<AppStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createAppStore();
  }

  return (
    <AppContextProvider app={app} settings={settings}>
      <ComponentContextProvider component={view}>
        <AppStoreProvider store={storeRef.current}>
          <EditorRefsProvider>
            <EditorOnlyAppRoot initialState={initialState}>
              <PostsProvider>
                <PopoutInputArea />
              </PostsProvider>
            </EditorOnlyAppRoot>
          </EditorRefsProvider>
        </AppStoreProvider>
      </ComponentContextProvider>
    </AppContextProvider>
  );
};

const EditorOnlyAppRoot: React.FC<{
  children: React.ReactNode;
  initialState: DaystreamEditorViewState | null;
}> = ({ children, initialState }) => {
  const { settings, storage, shell } = useAppContext();
  const store = useRequiredAppStore();

  useAppStoreInitialization({ shell, settings, storage }, store);

  // 意図: 編集対象ポストをストアへ反映する。
  // initialState は setViewState 経由で渡されるため、mount 後に一度だけ実行する。
  // deps に store だけを指定することで再レンダリング時の二重適用を防ぐ。
  useLayoutEffect(() => {
    if (!initialState) return;
    const { postInfo, message = "", draftMetadata = {}, draftMetadataBase = {} } = initialState;
    if (postInfo) {
      const post = reconstructEditingPost(postInfo, message);
      store.getState().startEdit(post);
      store.getState().setDraftMetadata(draftMetadata);
      store.getState().setDraftMetadataBase(draftMetadataBase);
      return;
    }

    // 意図: 新規投稿ポップアウトでは postInfo がないため、渡された下書きだけを復元する。
    store.getState().replaceInput(message);
    store.getState().setDraftMetadata(draftMetadata);
    store.getState().setDraftMetadataBase(draftMetadataBase);
  }, [store]); // oxlint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
};

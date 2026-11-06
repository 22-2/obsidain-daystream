// 意図: この style は最大化中の DSTR ビューを開いている間だけ必要だが、別のタブへ移っても
// 要素が残るため、Obsidian 本体の UI には「今アクティブなタブが最大化中の DSTR」のときだけ効かせる。
const ACTIVE_MAXIMIZED_DSTR_VIEW =
  'body:has(.workspace-leaf.mod-active [data-type="dstr-view"] .dstr-input-area.mod-maxmized)';
const ACTIVE_LEAF_TABS_MAXIMIZED_DSTR_VIEW =
  '.workspace-tabs:has(.workspace-leaf.mod-active [data-type="dstr-view"] .dstr-input-area.mod-maxmized)';

export const FULL_EXPANSION_STYLE = `
  /* タイトルバーとタブ見出しを隠す */
  ${ACTIVE_MAXIMIZED_DSTR_VIEW} .titlebar,
  ${ACTIVE_LEAF_TABS_MAXIMIZED_DSTR_VIEW} > .workspace-tab-header-container {
    display: none;
  }

  ${ACTIVE_MAXIMIZED_DSTR_VIEW} .main-content {
    margin: 0 var(--size-4-2);
  }

  /* 上部バーを畳む。 */
  [data-type="dstr-view"]:has(.dstr-input-area.mod-maxmized) .view-header {
    display: none;
  }

  /* コンテンツのパディングをリセット */
  [data-type="dstr-view"]:has(.dstr-input-area.mod-maxmized) .view-content {
    padding: 0!important;
  }

  /* フル展開時は画面を余すことなく使うため、右と下の余白を打ち消す */
  .dstr-input-area.mod-maxmized {
    margin-right: 0!important;
    margin-bottom: 0!important;
  }
`;

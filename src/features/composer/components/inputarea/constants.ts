export const FULL_EXPANSION_STYLE = `
  /* タイトルバー非表示 */
  .titlebar,
  .workspace-tab-header-container {
    display: none;
  }

  .main-content {
    margin: 0 var(--size-4-2);
  }

  /* 上部バーを畳む。 */
  [data-type="mfdi-view"]:has(.daystream-input-area.mod-maxmized) .view-header {
    display: none;
  }

  /* コンテンツのパディングをリセット */
  [data-type="mfdi-view"]:has(.daystream-input-area.mod-maxmized) .view-content {
    padding: 0!important;
  }

  .daystream-input-area {
    margin-right: 0!important;
  }

  /* フル展開時は画面を余すことなく使うため、下の余白を打ち消す */
  .daystream-input-area.mod-maxmized {
    margin-bottom: 0!important;
  }
`;

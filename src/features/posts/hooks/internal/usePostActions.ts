import { usePostMutations } from "src/features/posts/hooks/internal/usePostMutations";
import { useSubmitAction } from "src/features/composer/hooks/useSubmitAction";

/**
 * 投稿と一覧操作をまとめて検証するテスト用の束ね。
 * 意図: コンポーネントは必要な方だけを使うよう useSubmitAction / usePostMutations を直接呼び、
 * 使わない hook の購読を増やさない。
 */
export const usePostActions = () => {
  const { handleSubmit } = useSubmitAction();
  const mutations = usePostMutations();
  return { handleSubmit, ...mutations };
};

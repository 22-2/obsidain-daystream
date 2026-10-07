import React, { useState } from "react";
import { Box } from "src/core/ui/components/primitives";

interface ReadMoreContext {
  isOverflowing: boolean;
  expanded: boolean;
}

interface ReadMoreContentProps {
  // 行数超過の判定・切り詰めに使うテキスト。呼び出し元が持っている生テキストを渡す。
  text: string;
  // 「続きを読む」を表示する行数の閾値。
  threshold?: number;
  // 表示するテキストを受け取りコンテキストを返すレンダー関数。
  children: (displayText: string, context: ReadMoreContext) => React.ReactNode;
}

export const ReadMoreContent: React.FC<ReadMoreContentProps> = ({
  text,
  threshold = 5,
  children,
}) => {
  // expanded は一度 true になったら false に戻さない（別の場所をクリックしても展開したまま）。
  const [expanded, setExpanded] = useState(false);

  const lines = text.split("\n");
  const isOverflowing = lines.length > threshold;

  // 未展開時は先頭 threshold 行のみに切り詰める。展開後はフルテキスト。
  const displayText = expanded || !isOverflowing ? text : lines.slice(0, threshold).join("\n");

  return (
    <>
      {children(displayText, {
        isOverflowing,
        expanded,
      })}

      {/* 行数超過時の「続きを読む」ボタン。展開後は非表示。 */}
      {isOverflowing && !expanded && (
        <Box
          className="mfdi-read-more"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          続きを読む
        </Box>
      )}
    </>
  );
};

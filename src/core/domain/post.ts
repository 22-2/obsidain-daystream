import type { Moment } from "moment";
import type { Granularity } from "src/core/domain/granularity";

// 意図: 投稿を扱う core・DB・UI で日時と投稿の型を共有し、UI依存を持ち込まない。
export type MomentLike = Moment;

export interface Post {
  id: string;
  threadRootId: string | null;
  /** 投稿元のノート粒度。複数粒度の結果が混在する場合の識別に使う。 */
  noteGranularity?: Granularity;
  timestamp: MomentLike;
  noteDate: MomentLike;
  message: string;
  metadata: Record<string, string>;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  kind: "thino";
  path: string;
}

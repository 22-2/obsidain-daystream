// 意図: UI と Worker が同じ粒度契約を参照できるよう、表示層から独立させる。
export const GRANULARITIES = ["day", "week", "month", "quarter", "year"] as const;

export type Granularity = (typeof GRANULARITIES)[number];

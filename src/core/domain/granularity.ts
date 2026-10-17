// 意図: UI と Worker が同じ粒度契約を参照できるよう、表示層から独立させる。
// 粒度ごとの設定源はパッケージ側の表と一体なので、定義もパッケージに置く。
export { GRANULARITIES, type Granularity } from "@22-2/obsidian-daily-notes-kit";

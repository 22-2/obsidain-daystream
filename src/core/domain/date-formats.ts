// 意図: 保存データの日時形式を UI 表示形式から分離し、DBやcoreで共通利用する。
export const DATE_FORMAT = "YYYY-MM-DD";
export const TIME_FORMAT = "HH:mm:ss";
export const DATE_TIME_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`;

/** アイコンの大きさ。数値は px、文字列は CSS の長さとして扱う。 */
export type IconSize = number | string;

export const toIconCssSize = (size: IconSize): string =>
  typeof size === "number" ? `${size}px` : size;

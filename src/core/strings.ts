export function excludeWikiLink(text: string): string {
  return text.replace(/\[\[[^\]]+\|(.*?)]]/g, "$1").replace(/\[\[([^\]]+)]]/g, "$1");
}

export function replaceDayToJa(text: string): string {
  return text
    .replace("Sun", "日")
    .replace("Mon", "月")
    .replace("Tue", "火")
    .replace("Wed", "水")
    .replace("Thu", "木")
    .replace("Fri", "金")
    .replace("Sat", "土");
}

export function pickUrls(str: string): string[] {
  const urlMatches = Array.from(str.matchAll(/(^| |\(|\n)(?<url>https?:\/\/[^ \n]+)/g));
  return urlMatches.flatMap((match) => match.groups?.url ?? []);
}

export function sjis2String(sjisBuffer: ArrayBuffer): string {
  return new TextDecoder("shift_jis").decode(sjisBuffer);
}

/**
 * EUC-JPのbufferをstringに変換します
 */
export function eucJp2String(eucJpBuffer: ArrayBuffer): string {
  return new TextDecoder("euc-jp").decode(eucJpBuffer);
}

export function trimRedundantEmptyLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").replace(/\n+$/g, "");
}

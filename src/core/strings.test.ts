import { describe, expect, test } from "vitest";

import {
  excludeWikiLink,
  pickUrls,
  replaceDayToJa,
  trimRedundantEmptyLines,
} from "src/core/strings";

describe.each`
  text              | expected
  ${"[[hoge]]"}     | ${"hoge"}
  ${"[[hoge|aaa]]"} | ${"aaa"}
  ${"*aa*"}         | ${"*aa*"}
  ${"**aa**"}       | ${"**aa**"}
  ${"`aa`"}         | ${"`aa`"}
  ${"[hoge](URL)"}  | ${"[hoge](URL)"}
`("excludeWikiLink", ({ text, expected }: { text: string; expected: string }) => {
  test(`excludeWikiLink(${text}) = ${expected}`, () => {
    expect(excludeWikiLink(text)).toBe(expected);
  });
});

describe.each`
  text                  | expected
  ${"YYYY-MM-dd (Sun)"} | ${"YYYY-MM-dd (日)"}
  ${"YYYY-MM-dd (Mon)"} | ${"YYYY-MM-dd (月)"}
  ${"YYYY-MM-dd (Tue)"} | ${"YYYY-MM-dd (火)"}
  ${"YYYY-MM-dd (Wed)"} | ${"YYYY-MM-dd (水)"}
  ${"YYYY-MM-dd (Thu)"} | ${"YYYY-MM-dd (木)"}
  ${"YYYY-MM-dd (Fri)"} | ${"YYYY-MM-dd (金)"}
  ${"YYYY-MM-dd (Sat)"} | ${"YYYY-MM-dd (土)"}
`("replaceDayToJa", ({ text, expected }: { text: string; expected: string }) => {
  test(`replaceDayToJa(${text}) = ${expected}`, () => {
    expect(replaceDayToJa(text)).toBe(expected);
  });
});

// XXX: Markdownは一旦未対応にする
// ${"[hoge](https://hoge.com)"}                    | ${["https://hoge.com"]}
// ${"aa [hoge](https://hoge.com) aa"}              | ${["https://hoge.com"]}
describe.each`
  text                                             | expected
  ${"https://hoge.com"}                            | ${["https://hoge.com"]}
  ${"  https://hoge.com"}                          | ${["https://hoge.com"]}
  ${"https://hoge.com  "}                          | ${["https://hoge.com"]}
  ${"  https://hoge.com  "}                        | ${["https://hoge.com"]}
  ${"aaa https://hoge.com bbb"}                    | ${["https://hoge.com"]}
  ${"aaa\nhttps://hoge.com\nbbb"}                  | ${["https://hoge.com"]}
  ${"aaa https://hoge.com bbb http://fuga.com"}    | ${["https://hoge.com", "http://fuga.com"]}
  ${"aaa\nhttps://hoge.com\nbbb\nhttp://fuga.com"} | ${["https://hoge.com", "http://fuga.com"]}
  ${"https://hoge.com/hoge/%2F(fuga)hoge"}         | ${["https://hoge.com/hoge/%2F(fuga)hoge"]}
  ${"https://hoge.com%20(vim)"}                    | ${["https://hoge.com%20(vim)"]}
`("pickUrls", ({ text, expected }: { text: string; expected: string[] }) => {
  test(`pickUrls(${text}) = ${expected.join(", ")}`, () => {
    expect(pickUrls(text)).toStrictEqual(expected);
  });
});

describe.each`
  text                 | expected
  ${"aaa"}             | ${"aaa"}
  ${"aaa\nbbb"}        | ${"aaa\nbbb"}
  ${"aaa\n\nbbb"}      | ${"aaa\n\nbbb"}
  ${"aaa\n\n\nbbb"}    | ${"aaa\n\nbbb"}
  ${"aaa\nbbb\n"}      | ${"aaa\nbbb"}
  ${"aaa\nbbb\n\n"}    | ${"aaa\nbbb"}
  ${"aaa\nbbb\n\nccc"} | ${"aaa\nbbb\n\nccc"}
`("trimRedundantEmptyLines", ({ text, expected }: { text: string; expected: string }) => {
  test(`trimRedundantEmptyLines(${text}) = ${expected}`, () => {
    expect(trimRedundantEmptyLines(text)).toBe(expected);
  });
});

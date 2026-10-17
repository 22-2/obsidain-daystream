import { forceLowerCaseKeys } from "src/core/collections";
import { describe, expect, test } from "vitest";

describe("forceLowerCaseKeys", () => {
  test("大文字を含むキーを小文字へ揃える", () => {
    expect(forceLowerCaseKeys({ key: 1, key2: 2, Key3: 3, KEY4: 4 })).toStrictEqual({
      key: 1,
      key2: 2,
      key3: 3,
      key4: 4,
    });
  });
});

// describe.each<{
//   arr: unknown[];
//   toValue: (x: any) => string;
//   expected: { [key: string]: unknown };
// }>`
//   arr                           | toValue            | expected
//   ${["aa", "ii"]}               | ${(x: any) => x}   | ${{ aa: "aa", ii: "ii" }}
//   ${[{ s: "aa" }, { s: "ii" }]} | ${(x: any) => x.s} | ${{ aa: "aa", ii: "ii" }}
// `("mirrorMap", ({ arr, toValue, expected }) => {
//   test(`mirrorMap(${arr}, ${toValue}) = ${expected}`, () => {
//     expect(mirrorMap(arr, toValue)).toStrictEqual(expected);
//   });
// });

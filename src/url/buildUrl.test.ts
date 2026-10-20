import { describe, expect, it } from "vitest";
import { buildUrl } from "./buildUrl.js";

describe("buildUrl（URL 构建）", () => {
  it("基础拼接：path + 参数", () => {
    expect(buildUrl("/search", { q: "hello world", page: 2 })).toBe(
      "/search?q=hello+world&page=2",
    );
  });

  it("参数值统一 String() 化", () => {
    expect(buildUrl("/p", { a: 1, b: true })).toBe("/p?a=1&b=true");
  });

  it("null / undefined 的参数被忽略", () => {
    expect(buildUrl("/p", { a: null, b: undefined, c: "1" })).toBe("/p?c=1");
    expect(buildUrl("/p", { a: null })).toBe("/p");
  });

  it("path 已带 query 时用 & 追加", () => {
    expect(buildUrl("/list?tab=all", { page: 1 })).toBe("/list?tab=all&page=1");
  });

  it("参数值经过编码（空格与特殊字符）", () => {
    expect(buildUrl("/p", { tag: "a&b c" })).toBe("/p?tag=a%26b+c");
  });

  it("空参数时原样返回 path", () => {
    expect(buildUrl("/p", {})).toBe("/p");
  });
});

import { describe, expect, it } from "vitest";
import { updateSearchParams } from "./updateSearchParams.js";

describe("updateSearchParams（参数增删改查）", () => {
  it("设置新参数", () => {
    expect(updateSearchParams("/p?a=1", { b: "2" })).toBe("/p?a=1&b=2");
  });

  it("覆盖已有参数", () => {
    expect(updateSearchParams("/p?a=1&b=2", { a: "9" })).toBe("/p?a=9&b=2");
  });

  it("值为 null 删除参数", () => {
    expect(updateSearchParams("/p?a=1&b=2", { a: null })).toBe("/p?b=2");
  });

  it("值为 undefined 同样删除参数", () => {
    expect(updateSearchParams("/p?a=1&b=2", { a: undefined })).toBe("/p?b=2");
  });

  it("同名多个值一并删除", () => {
    expect(updateSearchParams("/p?a=1&a=2&b=3", { a: null })).toBe("/p?b=3");
  });

  it("保留路径与 #hash", () => {
    expect(updateSearchParams("/p?a=1#sec", { b: "2" })).toBe("/p?a=1&b=2#sec");
  });

  it("无 query 的 URL 按需补 ?", () => {
    expect(updateSearchParams("/p", { a: "1" })).toBe("/p?a=1");
  });

  it("删除后 query 为空时移除 ?", () => {
    expect(updateSearchParams("/p?a=1", { a: null })).toBe("/p");
  });

  it("空 patch 原样返回", () => {
    expect(updateSearchParams("/p?a=1&b=2#h", {})).toBe("/p?a=1&b=2#h");
  });

  it("参数值经过编码", () => {
    expect(updateSearchParams("/p", { q: "a&b c" })).toBe("/p?q=a%26b+c");
  });

  it("绝对 URL 同样支持", () => {
    expect(
      updateSearchParams("https://x.com/p?a=1#f", { a: "2" }),
    ).toBe("https://x.com/p?a=2#f");
  });

  it("数值与布尔值 String() 化", () => {
    expect(updateSearchParams("/p", { page: 3, all: true })).toBe("/p?page=3&all=true");
  });

  it("? 出现在 # 之后时视为无 query（防御）", () => {
    expect(updateSearchParams("/p#frag?x=1", { a: "1" })).toBe("/p?a=1#frag?x=1");
  });
});

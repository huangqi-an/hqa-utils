import { describe, expect, it } from "vitest";
import { parseQuery } from "./parseQuery.js";

describe("parseQuery（查询字符串解析）", () => {
  it("解析裸 query", () => {
    expect(parseQuery("a=1&b=2")).toEqual({ a: "1", b: "2" });
  });

  it("解析带 ? 前缀的 query", () => {
    expect(parseQuery("?a=1")).toEqual({ a: "1" });
  });

  it("完整 URL 只截取 ? 到 # 之间的部分", () => {
    expect(parseQuery("https://x.com/p?b=2&a=1#hash")).toEqual({ b: "2", a: "1" });
  });

  it("重复 key 合并为数组，保持出现顺序", () => {
    expect(parseQuery("a=1&a=2&a=3")).toEqual({ a: ["1", "2", "3"] });
    expect(parseQuery("a=1&a=2")).toEqual({ a: ["1", "2"] });
  });

  it("无值 key 解析为空字符串", () => {
    expect(parseQuery("a&b=1")).toEqual({ a: "", b: "1" });
  });

  it("裸 + 转空格，百分号编码正常解码", () => {
    expect(parseQuery("q=hello+world&name=%E4%B8%AD%E6%96%87")).toEqual({
      q: "hello world",
      name: "中文",
    });
  });

  it("编码后的 %2B 解码为 + 且不被误转为空格", () => {
    expect(parseQuery("t=1%2B2")).toEqual({ t: "1+2" });
  });

  it("非法百分号编码不抛错，保留原样", () => {
    expect(parseQuery("a=%zz&b=%E4")).toEqual({ a: "%zz", b: "%E4" });
  });

  it("空输入返回空对象", () => {
    expect(parseQuery("")).toEqual({});
    expect(parseQuery("?")).toEqual({});
    expect(parseQuery("https://x.com/p#h")).toEqual({});
  });

  it("值中的 = 保持原样", () => {
    expect(parseQuery("token=abc=def")).toEqual({ token: "abc=def" });
  });
});

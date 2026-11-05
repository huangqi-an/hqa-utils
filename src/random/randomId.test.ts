import { describe, expect, it } from "vitest";
import { randomId } from "./randomId.js";

const DEFAULT_ALPHABET =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

describe("randomId（随机唯一 ID）", () => {
  it("默认 21 字符，且全部落在默认字母表内", () => {
    const id = randomId();
    expect(id).toHaveLength(21);
    for (const ch of id) {
      expect(DEFAULT_ALPHABET).toContain(ch);
    }
  });

  it("size 定制长度", () => {
    expect(randomId(8)).toHaveLength(8);
    expect(randomId(1)).toHaveLength(1);
  });

  it("size 为 0 返回空串", () => {
    expect(randomId(0)).toBe("");
  });

  it("多次调用结果互不相同", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => randomId()));
    expect(ids.size).toBe(1000);
  });

  it("自定义字母表走通用路径，输出落在字符集内", () => {
    const id = randomId(12, "01");
    expect(id).toHaveLength(12);
    for (const ch of id) {
      expect(["0", "1"]).toContain(ch);
    }
  });

  it("自定义字母表长度非 2 的幂时依然无偏可用", () => {
    const alphabet = "abcdef"; // 6 字符（非 2 的幂，走拒绝采样）
    const id = randomId(30, alphabet);
    expect(id).toHaveLength(30);
    for (const ch of id) {
      expect(alphabet).toContain(ch);
    }
  });

  it("非法参数抛 RangeError", () => {
    expect(() => randomId(-1)).toThrow(RangeError);
    expect(() => randomId(1.5)).toThrow(RangeError);
    expect(() => randomId(10, "a")).toThrow(RangeError); // 字母表太短
    expect(() => randomId(10, "a".repeat(257))).toThrow(RangeError);
  });
});

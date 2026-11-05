import { afterEach, describe, expect, it, vi } from "vitest";
import { uuid } from "./uuid.js";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid（UUID v4 全环境生成）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("secure context（原生 randomUUID）：格式正确", () => {
    // node 环境自带 crypto.randomUUID，走第 1 级
    expect(uuid()).toMatch(UUID_V4_RE);
  });

  it("仅 getRandomValues（HTTP 模拟）：手拼路径同样产出 v4 格式", () => {
    // 模拟 HTTP 环境：crypto 存在但没有 randomUUID
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
    });
    const id = uuid();
    expect(id).toMatch(UUID_V4_RE);
    expect(id).toHaveLength(36);
  });

  it("手拼路径的版本位与变体位符合 RFC 4122", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        // 全 0 输入：若不做位运算，版本位/变体位不可能正确——验证位运算确实生效
        arr.fill(0);
        return arr;
      },
    });
    const id = uuid();
    expect(id).toMatch(UUID_V4_RE);
    expect(id[14]).toBe("4"); // 版本位
    expect(["8", "9", "a", "b"]).toContain(id[19]!); // 变体位
  });

  it("无 crypto：Math.random 兜底，格式仍为 v4", () => {
    vi.stubGlobal("crypto", undefined);
    const id = uuid();
    expect(id).toMatch(UUID_V4_RE);
    expect(id).toHaveLength(36);
  });

  it("secure: true 且 crypto 完整时正常生成（不影响前两级）", () => {
    expect(uuid({ secure: true })).toMatch(UUID_V4_RE);
  });

  it("secure: true 且仅 getRandomValues 时走手拼路径", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
    });
    expect(uuid({ secure: true })).toMatch(UUID_V4_RE);
  });

  it("secure: true 且无 crypto 时抛错（拒绝低熵兜底）", () => {
    vi.stubGlobal("crypto", undefined);
    expect(() => uuid({ secure: true })).toThrow(/secure: true/);
  });

  it("多次调用互不相同", () => {
    const ids = new Set(Array.from({ length: 500 }, () => uuid()));
    expect(ids.size).toBe(500);
  });
});

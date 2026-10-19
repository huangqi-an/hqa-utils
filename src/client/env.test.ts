import { afterEach, describe, expect, it, vi } from "vitest";
import { getUserAgent, isBrowser } from "./env.js";

describe("isBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Node 环境下返回 false", () => {
    expect(isBrowser()).toBe(false);
  });

  it("存在 window 与 document 时返回 true", () => {
    vi.stubGlobal("window", { document: {} });
    expect(isBrowser()).toBe(true);
  });

  it("只有 window 没有 document 时返回 false", () => {
    vi.stubGlobal("window", {});
    expect(isBrowser()).toBe(false);
  });
});

describe("getUserAgent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("浏览器环境返回 navigator.userAgent", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Test)" });
    expect(getUserAgent()).toBe("Mozilla/5.0 (Test)");
  });

  it("navigator.userAgent 为空字符串时返回 null", () => {
    vi.stubGlobal("navigator", { userAgent: "" });
    expect(getUserAgent()).toBeNull();
  });

  it("navigator 存在但无 userAgent 属性时返回 null", () => {
    vi.stubGlobal("navigator", {});
    expect(getUserAgent()).toBeNull();
  });

  it("无 navigator 时返回 null", () => {
    vi.stubGlobal("navigator", undefined);
    expect(getUserAgent()).toBeNull();
  });
});

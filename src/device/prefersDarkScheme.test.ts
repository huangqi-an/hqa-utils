// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersDarkScheme } from "./prefersDarkScheme.js";

describe("prefersDarkScheme（系统深色偏好）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("媒体查询匹配时返回 true，且使用正确的查询串", () => {
    const stub = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", stub);
    expect(prefersDarkScheme()).toBe(true);
    expect(stub).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  it("媒体查询不匹配时返回 false", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    expect(prefersDarkScheme()).toBe(false);
  });

  it("非浏览器环境返回 false", () => {
    vi.stubGlobal("window", undefined);
    expect(prefersDarkScheme()).toBe(false);
  });
});

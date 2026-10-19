// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isMouseSupported } from "./isMouseSupported.js";

describe("isMouseSupported（指针能力检测）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matchMedia 匹配 (pointer: fine) 时返回 true", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", matchMedia);
    expect(isMouseSupported()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(pointer: fine)");
  });

  it("不匹配（触屏主力设备）时返回 false", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    expect(isMouseSupported()).toBe(false);
  });

  it("无 window 时返回 false", () => {
    vi.stubGlobal("window", undefined);
    expect(isMouseSupported()).toBe(false);
  });

  it("window.matchMedia 不是函数时返回 false（旧浏览器）", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(isMouseSupported()).toBe(false);
  });
});

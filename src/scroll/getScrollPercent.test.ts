// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getScrollPercent } from "./getScrollPercent.js";

describe("getScrollPercent（滚动进度百分比）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("窗口滚动：按 scrollY / (scrollHeight - innerHeight) 计算", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 3000,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 550, configurable: true });
    expect(getScrollPercent()).toBe(25);
  });

  it("窗口越界滚动收敛到 100", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 3000,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 99999, configurable: true });
    expect(getScrollPercent()).toBe(100);
  });

  it("内容不超出视口时返回 100", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 800,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    expect(getScrollPercent()).toBe(100);
  });

  it("元素滚动：按内部 scrollTop 计算", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollHeight", { value: 1100, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 100, configurable: true });
    expect(getScrollPercent(el)).toBe(10);
  });

  it("元素内容不超出时返回 100", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollHeight", { value: 100, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 0, configurable: true });
    expect(getScrollPercent(el)).toBe(100);
  });

  it("非浏览器环境未传元素时返回 0", () => {
    vi.stubGlobal("window", undefined);
    expect(getScrollPercent()).toBe(0);
  });
});

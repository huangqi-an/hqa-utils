// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onScrollDirection } from "./onScrollDirection.js";

function setScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", { value, configurable: true });
}

describe("onScrollDirection（滚动方向监听）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("订阅后第一次滚动即按实际方向触发", () => {
    setScrollY(0);
    const dirs: string[] = [];
    onScrollDirection(window, (d) => dirs.push(d));
    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    expect(dirs).toEqual(["down"]);
  });

  it("方向反转时依次触发 down / up", () => {
    setScrollY(0);
    const dirs: string[] = [];
    onScrollDirection(window, (d) => dirs.push(d));
    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    setScrollY(40);
    window.dispatchEvent(new Event("scroll"));
    setScrollY(80);
    window.dispatchEvent(new Event("scroll"));
    expect(dirs).toEqual(["down", "up", "down"]);
  });

  it("垂直位置不变（如水平滚动）不触发", () => {
    setScrollY(100);
    const dirs: string[] = [];
    onScrollDirection(window, (d) => dirs.push(d));
    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    expect(dirs).toEqual([]);
  });

  it("tolerance 带内滚动不触发且不更新基准，越带后触发", () => {
    setScrollY(0);
    const dirs: string[] = [];
    onScrollDirection(window, (d) => dirs.push(d), { tolerance: 50 });
    setScrollY(30); // 带内
    window.dispatchEvent(new Event("scroll"));
    expect(dirs).toEqual([]);
    setScrollY(80); // 越带（80 > 0 + 50）
    window.dispatchEvent(new Event("scroll"));
    expect(dirs).toEqual(["down"]);
  });

  it("元素内部滚动按 scrollTop 判断", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 0, configurable: true });
    const dirs: string[] = [];
    onScrollDirection(el, (d) => dirs.push(d));
    Object.defineProperty(el, "scrollTop", { value: 200, configurable: true });
    el.dispatchEvent(new Event("scroll"));
    Object.defineProperty(el, "scrollTop", { value: 120, configurable: true });
    el.dispatchEvent(new Event("scroll"));
    expect(dirs).toEqual(["down", "up"]);
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("window", undefined);
    const unsubscribe = onScrollDirection(window, () => {});
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});

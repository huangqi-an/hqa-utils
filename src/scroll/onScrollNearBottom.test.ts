// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { onScrollNearBottom } from "./onScrollNearBottom.js";

function stubWindowScroll(scrollHeight: number, innerHeight: number, scrollY: number): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", { value: innerHeight, configurable: true });
  Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
}

// 统一视口：scrollHeight 2000 - innerHeight 800 = 最大滚动 2000 - 800 = 1200，scrollY ∈ [0, 1200]
describe("onScrollNearBottom（接近底部监听）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("订阅时已在区域内立即触发", () => {
    stubWindowScroll(2000, 800, 1150); // 距底 50
    const cb = vi.fn();
    onScrollNearBottom(window, cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("订阅时不在区域内不触发", () => {
    stubWindowScroll(2000, 800, 700); // 距底 500
    const cb = vi.fn();
    onScrollNearBottom(window, cb);
    expect(cb).not.toHaveBeenCalled();
  });

  it("滚动进入区域后触发", () => {
    stubWindowScroll(2000, 800, 700); // 距底 500
    const cb = vi.fn();
    onScrollNearBottom(window, cb);
    expect(cb).not.toHaveBeenCalled();
    Object.defineProperty(window, "scrollY", { value: 1150, configurable: true }); // 距底 50
    window.dispatchEvent(new Event("scroll"));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("level 语义：停留期间每次滚动都会触发，防重由调用方负责", () => {
    stubWindowScroll(2000, 800, 1150);
    const cb = vi.fn();
    onScrollNearBottom(window, cb);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    expect(cb).toHaveBeenCalledTimes(3); // 订阅时 1 次 + 滚动 2 次
  });

  it("threshold 自定义", () => {
    stubWindowScroll(2000, 800, 950); // 距底 250：默认 threshold 100 不触发，300 触发
    const cb = vi.fn();
    onScrollNearBottom(window, cb, { threshold: 300 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("元素内部滚动按元素尺寸计算", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 1450, configurable: true }); // 距底 50
    const cb = vi.fn();
    onScrollNearBottom(el, cb);
    expect(cb).toHaveBeenCalledTimes(1);
    Object.defineProperty(el, "scrollTop", { value: 0, configurable: true });
    el.dispatchEvent(new Event("scroll"));
    expect(cb).toHaveBeenCalledTimes(1); // 回到顶部不触发
  });

  it("取消订阅后不再触发", () => {
    stubWindowScroll(2000, 800, 700);
    const cb = vi.fn();
    const stop = onScrollNearBottom(window, cb);
    stop();
    Object.defineProperty(window, "scrollY", { value: 1150, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    expect(cb).not.toHaveBeenCalled();
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("window", undefined);
    const unsubscribe = onScrollNearBottom(window, () => {});
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onScrollStop } from "./onScrollStop.js";

describe("onScrollStop（滚动停止监听）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("滚动停止 delay 后触发一次", () => {
    const cb = vi.fn();
    onScrollStop(window, cb, { delay: 100 });
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(99);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("连续滚动只在最终停止后触发一次", () => {
    const cb = vi.fn();
    onScrollStop(window, cb, { delay: 100 });
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(50); // 每次间隔小于 delay，不断重置计时
    }
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("默认 delay 为 150ms", () => {
    const cb = vi.fn();
    onScrollStop(window, cb);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(149);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("取消订阅会清掉挂起未触发的回调", () => {
    const cb = vi.fn();
    const stop = onScrollStop(window, cb);
    window.dispatchEvent(new Event("scroll"));
    stop();
    vi.advanceTimersByTime(500);
    expect(cb).not.toHaveBeenCalled();
  });

  it("元素内部滚动", () => {
    const el = document.createElement("div");
    const cb = vi.fn();
    onScrollStop(el, cb, { delay: 100 });
    el.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("window", undefined);
    const stop = onScrollStop(window, () => {});
    expect(typeof stop).toBe("function");
    expect(() => stop()).not.toThrow();
  });
});

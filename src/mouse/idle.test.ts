// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onMouseIdle } from "./idle.js";

describe("onMouseIdle（鼠标空闲检测）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function move(): void {
    window.dispatchEvent(new MouseEvent("mousemove"));
  }

  function down(): void {
    window.dispatchEvent(new MouseEvent("mousedown"));
  }

  it("空闲达到阈值后触发一次回调", () => {
    const callback = vi.fn();
    const stop = onMouseIdle(callback, 1000);
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it("mousemove 活动会重置计时", () => {
    const callback = vi.fn();
    const stop = onMouseIdle(callback, 1000);
    vi.advanceTimersByTime(999);
    move();
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it("mousedown 活动同样重置计时", () => {
    const callback = vi.fn();
    const stop = onMouseIdle(callback, 1000);
    vi.advanceTimersByTime(999);
    down();
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it("触发后自动停止监听，后续活动不再触发", () => {
    const callback = vi.fn();
    const stop = onMouseIdle(callback, 500);
    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
    move();
    vi.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it("stop() 后立即停止计时与监听", () => {
    const callback = vi.fn();
    const stop = onMouseIdle(callback, 500);
    stop();
    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("自定义 target：只响应目标上的活动", () => {
    const el = document.createElement("div");
    const callback = vi.fn();
    const stop = onMouseIdle(callback, 1000, { target: el });
    vi.advanceTimersByTime(999);
    // window 上的活动不影响 el 的计时
    move();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    // el 上的活动重置计时并重新开始
    const callback2 = vi.fn();
    const stop2 = onMouseIdle(callback2, 1000, { target: el });
    vi.advanceTimersByTime(999);
    el.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    vi.advanceTimersByTime(999);
    expect(callback2).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback2).toHaveBeenCalledTimes(1);
    stop();
    stop2();
  });

  it("回调内抛错不影响已解绑状态（一次性语义）", () => {
    const callback = vi.fn(() => {
      throw new Error("boom");
    });
    const stop = onMouseIdle(callback, 500);
    expect(() => vi.advanceTimersByTime(500)).toThrow("boom");
    move();
    vi.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it.each([0, -1, NaN, Infinity])("ms 为 %p 时抛出 RangeError", (ms) => {
    expect(() => onMouseIdle(vi.fn(), ms)).toThrow(RangeError);
  });

  it("SSR（无 window 且未传 target）返回 noop 不抛错", () => {
    vi.stubGlobal("window", undefined);
    const stop = onMouseIdle(vi.fn(), 1000);
    expect(() => stop()).not.toThrow();
  });
});

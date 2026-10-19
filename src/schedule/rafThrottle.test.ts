// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { rafThrottle } from "./rafThrottle.js";

describe("rafThrottle（帧节流）", () => {
  let callbacks: Array<() => void> = [];

  function stubRaf(): void {
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
      callbacks.push(cb);
      return callbacks.length;
    });
  }

  function triggerFrame(): void {
    const pending = callbacks;
    callbacks = [];
    for (const cb of pending) cb();
  }

  afterEach(() => {
    callbacks = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("一帧内多次调用只执行一次，参数取最后一次", () => {
    stubRaf();
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    throttled(1);
    throttled(2);
    throttled(3);
    triggerFrame();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("不同帧各执行一次", () => {
    stubRaf();
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    throttled(1);
    triggerFrame();
    throttled(2);
    triggerFrame();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 1);
    expect(fn).toHaveBeenNthCalledWith(2, 2);
  });

  it("帧内无调用则帧回调空跑不执行", () => {
    stubRaf();
    const fn = vi.fn();
    rafThrottle(fn);
    triggerFrame();
    expect(fn).not.toHaveBeenCalled();
  });

  it("cancel() 取消未执行的调用", () => {
    stubRaf();
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    throttled(1);
    throttled.cancel();
    triggerFrame();
    expect(fn).not.toHaveBeenCalled();
    // cancel 后可正常再次使用
    throttled(2);
    triggerFrame();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it("cancel 幂等", () => {
    stubRaf();
    const throttled = rafThrottle(vi.fn());
    throttled(1);
    expect(() => {
      throttled.cancel();
      throttled.cancel();
    }).not.toThrow();
    triggerFrame();
  });

  it("fn 抛错后节流状态不破坏，可继续使用", () => {
    stubRaf();
    let shouldThrow = true;
    const fn = vi.fn((_x: number): void => {
      if (shouldThrow) throw new Error("boom");
    });
    const throttled = rafThrottle(fn);
    throttled(1);
    expect(() => triggerFrame()).toThrow("boom");
    // 异常逃逸但 scheduled 已复位，下次调用正常调度
    shouldThrow = false;
    throttled(2);
    triggerFrame();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(2);
  });

  it("无 rAF 环境降级为 setTimeout 16ms", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", undefined);
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    throttled(1);
    throttled(2);
    await vi.advanceTimersByTimeAsync(15);
    expect(fn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });
});

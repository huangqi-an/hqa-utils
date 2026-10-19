import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { throttle } from "./throttle.js";

describe("throttle（节流）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("默认 leading + trailing：周期首立即执行，周期末补执行最新参数", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled("a");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
    throttled("b");
    vi.advanceTimersByTime(60);
    throttled("c");
    vi.advanceTimersByTime(40);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("c");
  });

  it("持续调用按固定节拍执行，不重置计时", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    for (let t = 0; t <= 550; t += 10) {
      throttled(t);
      vi.advanceTimersByTime(10);
    }
    // 执行点：t=0, 100, 200, 300, 400, 500 共 6 次
    expect(fn).toHaveBeenCalledTimes(6);
  });

  it("leading: false 首次不立即执行，wait 末尾执行", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: false });
    throttled("a");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("trailing: false 吞没周期内调用，周期满后恢复立即执行", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { trailing: false });
    throttled("a");
    expect(fn).toHaveBeenCalledTimes(1);
    throttled("b");
    vi.advanceTimersByTime(50);
    throttled("c");
    vi.advanceTimersByTime(60);
    expect(fn).toHaveBeenCalledTimes(1);
    throttled("d");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("d");
  });

  it("cancel 停止后续执行并重置状态", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled("a");
    throttled("b");
    throttled.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    throttled("c");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("c");
  });

  it("flush 立即执行挂起调用，之后计时不再触发", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled("a");
    throttled("b");
    vi.advanceTimersByTime(50);
    throttled.flush();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("this 上下文正确透传", () => {
    let capturedThis: unknown = undefined;
    const throttled = throttle(function (this: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- 测试需捕获 this 以验证透传
      capturedThis = this;
    }, 100);
    const ctx = { id: 1 };
    throttled.call(ctx);
    expect(capturedThis).toBe(ctx);
  });

  it("泛型参数类型保持", () => {
    const throttled = throttle(vi.fn<(a: string, b: number) => void>(), 10);
    throttled("x", 1);
    // @ts-expect-error 参数类型不匹配应报错
    throttled(1, "x");
  });
});

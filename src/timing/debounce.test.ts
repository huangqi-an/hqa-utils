import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce.js";

describe("debounce（防抖）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("wait 内多次调用只执行最后一次，参数取最后一次", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    vi.advanceTimersByTime(50);
    debounced(2);
    vi.advanceTimersByTime(50);
    debounced(3);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("每次调用重置计时", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    vi.advanceTimersByTime(99);
    debounced(2);
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it("this 上下文与参数正确透传", () => {
    let capturedThis: unknown = undefined;
    let capturedArgs: unknown[] = [];
    const debounced = debounce(function (this: unknown, ...args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- 测试需捕获 this 以验证透传
      capturedThis = this;
      capturedArgs = args;
    }, 10);
    const ctx = { name: "ctx" };
    debounced.call(ctx, "a", 1);
    vi.advanceTimersByTime(10);
    expect(capturedThis).toBe(ctx);
    expect(capturedArgs).toEqual(["a", 1]);
  });

  it("leading: true 首次调用立即执行，静默结束补执行最后一次", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true });
    debounced("a");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
    debounced("b");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
  });

  it("leading: true 静默期后再次调用重新立即执行", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true });
    debounced("a");
    vi.advanceTimersByTime(200);
    debounced("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("leading: true 时周期内已有立即执行，静默结束无补执行", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true });
    debounced("a");
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("trailing: false 与 leading: true 配合吞没周期内调用", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true, trailing: false });
    debounced("a");
    expect(fn).toHaveBeenCalledTimes(1);
    debounced("b");
    debounced("c");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    debounced("d");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("d");
  });

  it("cancel 取消挂起调用，之后重新开始防抖周期", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
    debounced(2);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it("flush 立即执行挂起调用，之后计时不再触发", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    debounced(2);
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("无挂起调用时 flush 与 cancel 为空操作", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    expect(() => {
      debounced.flush();
      debounced.cancel();
    }).not.toThrow();
    expect(fn).not.toHaveBeenCalled();
  });

  it("泛型参数类型保持", () => {
    const debounced = debounce(vi.fn<(a: string, b: number) => void>(), 10);
    debounced("x", 1);
    // @ts-expect-error 参数类型不匹配应报错
    debounced(1, "x");
  });
});

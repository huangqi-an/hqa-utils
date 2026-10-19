// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { whenIdle, type IdleDeadline } from "./whenIdle.js";

const IDLE: IdleDeadline = {
  didTimeout: false,
  timeRemaining: () => 20,
};

describe("whenIdle（空闲任务）", () => {
  let ricCb: ((deadline: IdleDeadline) => void) | null = null;
  let ricOptions: { timeout?: number } | undefined;

  function stubRic(): void {
    vi.stubGlobal(
      "requestIdleCallback",
      (cb: (deadline: IdleDeadline) => void, options?: { timeout?: number }) => {
        ricCb = cb;
        ricOptions = options;
        return 1;
      },
    );
  }

  function triggerIdle(deadline: IdleDeadline): void {
    const cb = ricCb;
    ricCb = null;
    cb?.(deadline);
  }

  afterEach(() => {
    ricCb = null;
    ricOptions = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("无 fn 时 resolve IdleDeadline", async () => {
    stubRic();
    const p = whenIdle();
    expect(ricCb).not.toBeNull();
    triggerIdle(IDLE);
    await expect(p).resolves.toBe(IDLE);
  });

  it("有 fn 时执行并 resolve 返回值", async () => {
    stubRic();
    const fn = vi.fn((deadline: IdleDeadline) => deadline.timeRemaining() * 2);
    const p = whenIdle(fn);
    triggerIdle(IDLE);
    await expect(p).resolves.toBe(40);
    expect(fn).toHaveBeenCalledWith(IDLE);
  });

  it("timeout 选项透传给 requestIdleCallback", async () => {
    stubRic();
    const p = whenIdle(() => "ok", { timeout: 2000 });
    triggerIdle(IDLE);
    await p;
    expect(ricOptions).toEqual({ timeout: 2000 });
  });

  it("未传 timeout 时 options 为 undefined", async () => {
    stubRic();
    const p = whenIdle(() => "ok");
    triggerIdle(IDLE);
    await p;
    expect(ricOptions).toBeUndefined();
  });

  it("fn 抛错时 Promise 拒绝", async () => {
    stubRic();
    const error = new Error("boom");
    const p = whenIdle(() => {
      throw error;
    });
    triggerIdle(IDLE);
    await expect(p).rejects.toBe(error);
  });

  it("空闲触发前保持 pending", async () => {
    stubRic();
    const results: unknown[] = [];
    whenIdle(() => "x").then((v) => results.push(v));
    expect(results).toHaveLength(0);
    triggerIdle(IDLE);
    await vi.waitFor(() => expect(results).toHaveLength(1));
  });

  it.each([-1, NaN, Infinity])(
    "timeout 为 %p 时 Promise 拒绝 RangeError",
    async (timeout) => {
      await expect(whenIdle({ timeout })).rejects.toThrow(RangeError);
    },
  );

  it("降级：无 rIC 环境用 setTimeout 1ms，deadline 为强制触发形态", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const deadlines: IdleDeadline[] = [];
    whenIdle().then((d) => deadlines.push(d));
    whenIdle().then((d) => deadlines.push(d));
    await vi.advanceTimersByTimeAsync(0);
    expect(deadlines).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(deadlines).toHaveLength(2);
    for (const d of deadlines) {
      expect(d.didTimeout).toBe(true);
      expect(d.timeRemaining()).toBe(0);
    }
  });
});

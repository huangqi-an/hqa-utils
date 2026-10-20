import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PollAttemptsExhaustedError, pollUntil } from "./pollUntil.js";
import { TimeoutError } from "./withTimeout.js";
import { sleep } from "./sleep.js";

describe("pollUntil（轮询）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("首次成功立即 resolve，不等待间隔", async () => {
    let calls = 0;
    const result = await pollUntil(() => {
      calls++;
      return calls;
    });
    expect(result).toBe(1);
    expect(calls).toBe(1);
  });

  it("未完成时按 interval 重试，完成后 resolve 最后一次结果", async () => {
    let calls = 0;
    const p = pollUntil(
      () => {
        calls++;
        return calls >= 3 ? calls : 0;
      },
      undefined,
      { interval: 1000 },
    );
    await vi.advanceTimersByTimeAsync(2500);
    const result = await p;
    expect(result).toBe(3);
    expect(calls).toBe(3);
  });

  it("串行节拍：task 耗时超过 interval 时不重叠请求", async () => {
    const gaps: number[] = [];
    let lastExec = -1;
    const p = pollUntil(
      async () => {
        const now = Date.now();
        if (lastExec >= 0) gaps.push(now - lastExec);
        lastExec = now;
        await sleep(500);
        return gaps.length >= 1 ? 2 : 0;
      },
      undefined,
      { interval: 100 },
    );
    await vi.advanceTimersByTimeAsync(1200);
    const result = await p;
    expect(result).toBe(2);
    // 第二次执行等待首次 task 完成（t=500）后再等一个 interval（t=600），而非 t=100
    expect(gaps).toEqual([600]);
  });

  it("timeout 超时后以 TimeoutError reject", async () => {
    const p = pollUntil(() => 0, undefined, { interval: 500, timeout: 1000 });
    // advance 会触发 reject，必须先挂载处理，避免 unhandled rejection
    const errorPromise = p.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1000);
    const error = await errorPromise;
    expect(error).toBeInstanceOf(TimeoutError);
  });

  it("maxAttempts 用尽后以 PollAttemptsExhaustedError reject，携带尝试次数", async () => {
    const p = pollUntil(() => 0, undefined, { interval: 100, maxAttempts: 2 });
    const errorPromise = p.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(300);
    const error = await errorPromise;
    expect(error).toBeInstanceOf(PollAttemptsExhaustedError);
    expect((error as PollAttemptsExhaustedError).attempts).toBe(2);
  });

  it("backoff 指数退避：间隔按倍率增长", async () => {
    const gaps: number[] = [];
    let lastExec = -1;
    let calls = 0;
    const p = pollUntil(
      () => {
        const now = Date.now();
        if (lastExec >= 0) gaps.push(now - lastExec);
        lastExec = now;
        return ++calls >= 4 ? calls : 0;
      },
      undefined,
      { interval: 100, backoff: 2 },
    );
    await vi.advanceTimersByTimeAsync(800);
    const result = await p;
    expect(result).toBe(4);
    expect(gaps).toEqual([100, 200, 400]);
  });

  it("maxInterval 限制退避间隔上限", async () => {
    const gaps: number[] = [];
    let lastExec = -1;
    let calls = 0;
    const p = pollUntil(
      () => {
        const now = Date.now();
        if (lastExec >= 0) gaps.push(now - lastExec);
        lastExec = now;
        return ++calls >= 4 ? calls : 0;
      },
      undefined,
      { interval: 100, backoff: 10, maxInterval: 300 },
    );
    await vi.advanceTimersByTimeAsync(800);
    const result = await p;
    expect(result).toBe(4);
    // 100 * 10 = 1000 被截断为 300
    expect(gaps).toEqual([100, 300, 300]);
  });

  it("默认 task 抛错立即 reject", async () => {
    const p = pollUntil(() => {
      throw new Error("boom");
    });
    await expect(p).rejects.toThrow("boom");
  });

  it("tolerateErrors: true 容忍抛错继续轮询", async () => {
    let calls = 0;
    const p = pollUntil(
      () => {
        calls++;
        if (calls < 3) throw new Error("flaky");
        return calls;
      },
      undefined,
      { interval: 100, tolerateErrors: true },
    );
    await vi.advanceTimersByTimeAsync(300);
    const result = await p;
    expect(result).toBe(3);
    expect(calls).toBe(3);
  });

  it("isDone 自定义完成判断", async () => {
    const result = await pollUntil(() => ({ status: "done", data: 42 }), (d) => d.status === "done");
    expect(result.data).toBe(42);
  });

  it("参数不合法时同步抛出 RangeError", () => {
    expect(() => pollUntil(() => 1, undefined, { interval: -1 })).toThrow(RangeError);
    expect(() => pollUntil(() => 1, undefined, { backoff: 0.5 })).toThrow(RangeError);
    expect(() => pollUntil(() => 1, undefined, { maxAttempts: 0 })).toThrow(RangeError);
    expect(() => pollUntil(() => 1, undefined, { timeout: -100 })).toThrow(RangeError);
  });

  it("泛型结果类型保持", async () => {
    const result = await pollUntil(() => Promise.resolve("ok"));
    // 若类型收窄失败，该行为编译期报错
    const upper: string = result.toUpperCase();
    expect(upper).toBe("OK");
  });
});

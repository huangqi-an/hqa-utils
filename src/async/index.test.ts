import { describe, expect, it, vi } from "vitest";
import { retry, runWithLimit, sleep, TimeoutError, withTimeout } from "./index.js";

describe("sleep", () => {
  it("在指定时间后 resolve", async () => {
    const start = Date.now();
    await sleep(30);
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });
});

describe("runWithLimit", () => {
  it("结果保持输入顺序", async () => {
    const results = await runWithLimit([
      () => sleep(30).then(() => "slow"),
      () => sleep(1).then(() => "fast"),
    ]);
    expect(results).toEqual(["slow", "fast"]);
  });

  it("并发数不超过限制", async () => {
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(10);
      active--;
      return peak;
    });
    await runWithLimit(tasks, 3);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("空任务列表返回空数组", async () => {
    expect(await runWithLimit([], 2)).toEqual([]);
  });

  it("concurrency < 1 时抛出 RangeError", async () => {
    await expect(runWithLimit([], 0)).rejects.toThrow(RangeError);
  });

  it("任务失败时 reject", async () => {
    const err = new Error("boom");
    await expect(
      runWithLimit([() => Promise.reject(err)]),
    ).rejects.toBe(err);
  });
});

describe("withTimeout", () => {
  it("任务在限时内完成时返回结果", async () => {
    const result = await withTimeout(sleep(10).then(() => "ok"), 1000);
    expect(result).toBe("ok");
  });

  it("超过限时后抛出 TimeoutError", async () => {
    await expect(
      withTimeout(sleep(50), 10),
    ).rejects.toThrow(TimeoutError);
  });

  it("默认错误信息包含超时时长", async () => {
    await expect(withTimeout(sleep(50), 10)).rejects.toThrow(
      "Operation timed out after 10ms",
    );
  });

  it("支持自定义错误信息", async () => {
    await expect(
      withTimeout(sleep(50), 10, "太慢了"),
    ).rejects.toThrow("太慢了");
  });

  it("支持传入返回值的函数（同步返回也行）", async () => {
    expect(await withTimeout(() => 42, 1000)).toBe(42);
    expect(await withTimeout(() => Promise.resolve("hi"), 1000)).toBe("hi");
  });

  it("任务自身的错误原样抛出，不包装为 TimeoutError", async () => {
    const err = new Error("boom");
    await expect(withTimeout(Promise.reject(err), 1000)).rejects.toBe(err);
  });

  it("ms 非法时同步抛出 RangeError", () => {
    expect(() => withTimeout(Promise.resolve(1), -1)).toThrow(RangeError);
    expect(() => withTimeout(Promise.resolve(1), Number.NaN)).toThrow(RangeError);
  });
});

describe("retry", () => {
  it("首次成功时直接返回，不重试", async () => {
    const task = vi.fn(async () => "ok");
    expect(await retry(task)).toBe("ok");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("失败若干次后成功，返回最终结果", async () => {
    let calls = 0;
    const result = await retry(() => {
      calls++;
      if (calls < 3) throw new Error("fail");
      return Promise.resolve("done");
    });
    expect(result).toBe("done");
    expect(calls).toBe(3);
  });

  it("重试耗尽后抛出最后一次的错误", async () => {
    const err = new Error("always fail");
    await expect(
      retry(() => Promise.reject(err), { retries: 2 }),
    ).rejects.toBe(err);
  });

  it("默认最多执行 1 + 3 次", async () => {
    const task = vi.fn(() => Promise.reject(new Error("nope")));
    await expect(retry(task)).rejects.toThrow("nope");
    expect(task).toHaveBeenCalledTimes(4);
  });

  it("onRetry 收到错误和重试序号", async () => {
    const onRetry = vi.fn();
    let calls = 0;
    await retry(
      () => {
        calls++;
        if (calls < 3) throw new Error(`err-${calls}`);
        return Promise.resolve("ok");
      },
      { retries: 5, onRetry },
    );
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, new Error("err-1"), 1);
    expect(onRetry).toHaveBeenNthCalledWith(2, new Error("err-2"), 2);
  });

  it("shouldRetry 返回 false 时立即抛出，不再重试", async () => {
    const task = vi.fn(() => Promise.reject(new TypeError("fatal")));
    await expect(
      retry(task, {
        retries: 5,
        shouldRetry: (e) => !(e instanceof TypeError),
      }),
    ).rejects.toThrow(TypeError);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("固定间隔按 delay 等待", async () => {
    const start = Date.now();
    let calls = 0;
    await retry(
      () => {
        calls++;
        if (calls < 3) throw new Error("fail");
        return Promise.resolve("ok");
      },
      { retries: 3, delay: 30 },
    );
    // 2 次重试间隔 = 60ms
    expect(Date.now() - start).toBeGreaterThanOrEqual(55);
  });

  it("指数退避间隔逐次翻倍", async () => {
    const start = Date.now();
    let calls = 0;
    await retry(
      () => {
        calls++;
        if (calls < 3) throw new Error("fail");
        return Promise.resolve("ok");
      },
      { retries: 3, delay: 20, backoff: "exponential" },
    );
    // 间隔 20 + 40 = 60ms
    expect(Date.now() - start).toBeGreaterThanOrEqual(55);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("参数非法时 reject RangeError", async () => {
    await expect(retry(() => 1, { retries: -1 })).rejects.toThrow(RangeError);
    await expect(retry(() => 1, { retries: 1.5 })).rejects.toThrow(RangeError);
    await expect(retry(() => 1, { delay: -1 })).rejects.toThrow(RangeError);
  });
});

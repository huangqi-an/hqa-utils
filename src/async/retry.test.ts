import { describe, expect, it, vi } from "vitest";
import { retry } from "./retry.js";

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

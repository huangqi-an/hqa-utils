import { describe, expect, it } from "vitest";
import { runWithLimit, sleep } from "./index.js";

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

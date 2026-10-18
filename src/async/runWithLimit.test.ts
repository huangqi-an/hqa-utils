import { describe, expect, it } from "vitest";
import { runWithLimit } from "./runWithLimit.js";
import { sleep } from "./sleep.js";

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

  it("concurrency 非法时抛出 RangeError", async () => {
    const invalid = [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.NEGATIVE_INFINITY,
      "2" as unknown as number,
    ];
    for (const concurrency of invalid) {
      await expect(runWithLimit([], concurrency)).rejects.toThrow(RangeError);
    }
    await expect(runWithLimit([], 0)).rejects.toThrow(
      /positive integer or Infinity/,
    );
  });

  it("concurrency 为 Infinity 时全部并发执行", async () => {
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: 5 }, () => async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
      return "x";
    });
    const results = await runWithLimit(tasks, Number.POSITIVE_INFINITY);
    expect(results).toEqual(["x", "x", "x", "x", "x"]);
    expect(peak).toBe(5);
  });

  it("任务失败时 reject", async () => {
    const err = new Error("boom");
    await expect(
      runWithLimit([() => Promise.reject(err)]),
    ).rejects.toBe(err);
  });
});

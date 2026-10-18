import { describe, expect, it } from "vitest";
import { pLimit, QueueClearedError } from "./pLimit.js";
import { sleep } from "./sleep.js";

describe("pLimit", () => {
  it("并发数不超过限制", async () => {
    const limit = pLimit(3);
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, () =>
      limit(async () => {
        active++;
        peak = Math.max(peak, active);
        await sleep(10);
        active--;
      }),
    );
    await Promise.all(tasks);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("每个任务返回各自的结果", async () => {
    const limit = pLimit(2);
    const results = await Promise.all(
      [1, 2, 3, 4].map((n) => limit(async () => n * 10)),
    );
    expect(results).toEqual([10, 20, 30, 40]);
  });

  it("activeCount 和 pendingCount 正确反映状态", async () => {
    const limit = pLimit(2);
    expect(limit.activeCount).toBe(0);
    expect(limit.pendingCount).toBe(0);

    const promises = Array.from({ length: 5 }, () =>
      limit(() => sleep(20).then(() => "x")),
    );
    // 队列已同步入队：2 个执行中，3 个排队
    expect(limit.activeCount).toBe(2);
    expect(limit.pendingCount).toBe(3);

    await Promise.all(promises);
    expect(limit.activeCount).toBe(0);
    expect(limit.pendingCount).toBe(0);
  });

  it("某个任务失败不影响其他任务执行", async () => {
    const limit = pLimit(1);
    const results = await Promise.allSettled([
      limit(() => Promise.reject(new Error("boom"))),
      limit(async () => "ok"),
    ]);
    expect(results[0]!.status).toBe("rejected");
    expect(results[1]!.status).toBe("fulfilled");
    expect(results[1]).toMatchObject({ value: "ok" });
  });

  it("clearQueue 以 QueueClearedError reject 排队中的任务，不影响正在执行的", async () => {
    const limit = pLimit(1);
    let firstFinished = false;
    const first = limit(async () => {
      await sleep(30);
      firstFinished = true;
      return "first";
    });
    // 立刻挂上 catch，避免 reject 时产生 unhandled rejection 告警
    const q1 = limit(() => "q1").catch((e: unknown) => e);
    const q2 = limit(() => "q2").catch((e: unknown) => e);

    expect(limit.pendingCount).toBe(2);
    limit.clearQueue();
    expect(limit.pendingCount).toBe(0);

    expect(await q1).toBeInstanceOf(QueueClearedError);
    expect(await q2).toBeInstanceOf(QueueClearedError);

    const firstResult = await first;
    expect(firstResult).toBe("first");
    expect(firstFinished).toBe(true);
    // 清空后新的任务仍可正常执行
    expect(await limit(() => "new")).toBe("new");
  });

  it("clearQueue 后新任务正常执行", async () => {
    const limit = pLimit(1);
    const dummy = limit(() => sleep(10).then(() => "a"));
    const dropped = limit(() => "b").catch((e: unknown) => e);
    limit.clearQueue();
    await dummy;
    expect(await dropped).toBeInstanceOf(QueueClearedError);
    expect(await limit(() => "c")).toBe("c");
  });

  it("队列为空时调用 clearQueue 是安全的", () => {
    const limit = pLimit(2);
    expect(() => limit.clearQueue()).not.toThrow();
    expect(limit.pendingCount).toBe(0);
  });

  it("concurrency 非法时同步抛出 RangeError", () => {
    expect(() => pLimit(0)).toThrow(RangeError);
    expect(() => pLimit(-1)).toThrow(RangeError);
    expect(() => pLimit(1.5)).toThrow(RangeError);
  });
});

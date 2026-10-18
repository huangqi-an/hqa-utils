import { describe, expect, it } from "vitest";
import { pLimit } from "./pLimit.js";
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

  it("clearQueue 丢弃排队中的任务，但不影响正在执行的", async () => {
    const limit = pLimit(1);
    let firstFinished = false;
    const first = limit(async () => {
      await sleep(30);
      firstFinished = true;
      return "first";
    });
    const queued = [limit(() => "q1"), limit(() => "q2")];

    expect(limit.pendingCount).toBe(2);
    limit.clearQueue();
    expect(limit.pendingCount).toBe(0);

    const firstResult = await first;
    expect(firstResult).toBe("first");
    expect(firstFinished).toBe(true);
    // 被丢弃的排队任务永远不会 settle，这里只验证清空后新任务可正常执行
    expect(await limit(() => "new")).toBe("new");
    // 避免 queued 未使用告警
    void queued;
  });

  it("clearQueue 后新任务正常执行", async () => {
    const limit = pLimit(1);
    const dummy = limit(() => sleep(10).then(() => "a"));
    const never = limit(() => "b");
    limit.clearQueue();
    await dummy;
    expect(await limit(() => "c")).toBe("c");
    void never;
  });

  it("concurrency 非法时同步抛出 RangeError", () => {
    expect(() => pLimit(0)).toThrow(RangeError);
    expect(() => pLimit(-1)).toThrow(RangeError);
    expect(() => pLimit(1.5)).toThrow(RangeError);
  });
});

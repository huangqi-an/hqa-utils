import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createIdleQueue } from "./createIdleQueue.js";

interface RicStub {
  req: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  readonly pending: boolean;
  readonly options: unknown;
  fire(timeRemaining?: number, didTimeout?: boolean): void;
}

/** 手动 stub rIC：捕获回调，用 fire() 手动触发以控制时间轴 */
function stubRic(): RicStub {
  let cb: ((deadline: IdleDeadline) => void) | null = null;
  let capturedOptions: unknown;
  let nextId = 1;
  const req = vi.fn((fn: (deadline: IdleDeadline) => void, opts?: IdleRequestOptions): number => {
    cb = fn;
    capturedOptions = opts;
    return nextId++;
  });
  const cancel = vi.fn((_handle: number): void => {
    cb = null;
  });
  vi.stubGlobal("requestIdleCallback", req);
  vi.stubGlobal("cancelIdleCallback", cancel);
  return {
    req,
    cancel,
    get pending() {
      return cb !== null;
    },
    get options() {
      return capturedOptions;
    },
    fire(timeRemaining = 50, didTimeout = false): void {
      const fn = cb;
      cb = null;
      fn?.({
        didTimeout,
        timeRemaining: () => timeRemaining,
      });
    },
  };
}

describe("createIdleQueue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("Node/SSR 环境下可直接使用（setTimeout 降级，真实定时器）", async () => {
    const queue = createIdleQueue();
    await expect(queue.push(() => "node-ok")).resolves.toBe("node-ok");
  });

  describe("rIC 环境", () => {
    let ric: RicStub;
    beforeEach(() => {
      ric = stubRic();
    });

    it("push 后任务在空闲回调中执行，结果可 await", async () => {
      const queue = createIdleQueue();
      const task = vi.fn(() => 42);
      const p = queue.push(task);
      expect(ric.pending).toBe(true);
      expect(task).not.toHaveBeenCalled();
      ric.fire();
      await expect(p).resolves.toBe(42);
      expect(task).toHaveBeenCalledTimes(1);
    });

    it("FIFO 顺序执行", async () => {
      const queue = createIdleQueue();
      const results: number[] = [];
      const promises = [1, 2, 3].map((n) => queue.push(() => n).then((v) => results.push(v)));
      ric.fire();
      await Promise.all(promises);
      expect(results).toEqual([1, 2, 3]);
    });

    it("timeRemaining 不足时分帧：每批至少执行一个任务并重新调度", async () => {
      const queue = createIdleQueue();
      const p1 = queue.push(() => "a");
      const p2 = queue.push(() => "b");
      ric.fire(1); // 剩余时间仅够跑第一个任务
      await expect(p1).resolves.toBe("a");
      expect(queue.size).toBe(1);
      expect(ric.pending).toBe(true); // 剩余任务已重新调度
      ric.fire(50);
      await expect(p2).resolves.toBe("b");
      expect(queue.size).toBe(0);
    });

    it("timeout 触发（didTimeout、timeRemaining 为 0）时每批执行一个任务，稳步推进", async () => {
      const queue = createIdleQueue({ timeout: 50 });
      const p1 = queue.push(() => "a");
      const p2 = queue.push(() => "b");
      ric.fire(0, true);
      await expect(p1).resolves.toBe("a");
      expect(queue.size).toBe(1);
      ric.fire(0, true);
      await expect(p2).resolves.toBe("b");
    });

    it("timeout 选项透传给 requestIdleCallback，未配置时不传 options", () => {
      const queue = createIdleQueue({ timeout: 100 });
      queue.push(() => 1);
      expect(ric.options).toEqual({ timeout: 100 });
      const queue2 = createIdleQueue();
      queue2.push(() => 2);
      expect(ric.options).toBeUndefined();
    });

    it("任务同步抛错时对应 Promise reject，不影响后续任务", async () => {
      const queue = createIdleQueue();
      const boom = queue
        .push((): number => {
          throw new Error("boom");
        })
        .catch((error: Error) => error.message);
      const ok = queue.push(() => "ok");
      ric.fire();
      await expect(boom).resolves.toBe("boom");
      await expect(ok).resolves.toBe("ok");
    });

    it("任务返回 Promise 时结果透传（含 rejection）", async () => {
      const queue = createIdleQueue();
      const ok = queue.push(() => Promise.resolve("async-ok"));
      const failed = queue
        .push(() => Promise.reject(new Error("async-err")))
        .catch((error: Error) => error.message);
      ric.fire();
      await expect(ok).resolves.toBe("async-ok");
      await expect(failed).resolves.toBe("async-err");
    });

    it("任务执行中可以继续 push，新任务在本批预算内接着执行", async () => {
      const queue = createIdleQueue();
      const results: number[] = [];
      const p1 = queue.push(() => {
        results.push(1);
        return queue.push(() => results.push(3));
      });
      const p2 = queue.push(() => (results.push(2), 2));
      ric.fire(50);
      await Promise.all([p1, p2]);
      expect(results).toEqual([1, 2, 3]);
    });

    it("clear() 清空队列并以取消错误 reject 挂起任务", async () => {
      const queue = createIdleQueue();
      const task = vi.fn(() => 1);
      const cancelled = queue.push(task).catch((error: Error) => error.name);
      const cancelledMessage = queue.push(task).catch((error: Error) => error.message);
      queue.clear();
      expect(queue.size).toBe(0);
      await expect(cancelled).resolves.toBe("IdleQueueCancelledError");
      await expect(cancelledMessage).resolves.toBe("idle queue task cancelled");
      ric.fire();
      expect(task).not.toHaveBeenCalled();
    });

    it("destroy() 撤销已排定调度、拒绝挂起任务，之后 push 直接 reject", async () => {
      const queue = createIdleQueue();
      const task = vi.fn(() => 1);
      const pending = queue.push(task).catch((error: Error) => error.name);
      expect(ric.pending).toBe(true);
      queue.destroy();
      await expect(pending).resolves.toBe("IdleQueueDestroyedError");
      expect(ric.cancel).toHaveBeenCalled();
      expect(queue.size).toBe(0);
      await expect(queue.push(task).catch((error: Error) => error.name)).resolves.toBe(
        "IdleQueueDestroyedError",
      );
      ric.fire();
      expect(task).not.toHaveBeenCalled();
    });

    it("pause() 后空闲回调不派发，resume() 恢复", async () => {
      const queue = createIdleQueue();
      const task = vi.fn(() => 1);
      const p = queue.push(task);
      queue.pause();
      ric.fire();
      expect(task).not.toHaveBeenCalled();
      queue.resume();
      expect(ric.pending).toBe(true);
      ric.fire();
      await expect(p).resolves.toBe(1);
    });

    it("任务内 pause() 可中断本批派发，resume 后继续", async () => {
      const queue = createIdleQueue();
      const order: string[] = [];
      const p1 = queue.push(() => {
        order.push("a");
        queue.pause();
        return 1;
      });
      const p2 = queue.push(() => (order.push("b"), 2));
      ric.fire(50); // 预算充足，但任务内主动暂停
      await expect(p1).resolves.toBe(1);
      expect(order).toEqual(["a"]);
      queue.resume();
      ric.fire(50);
      await expect(p2).resolves.toBe(2);
      expect(order).toEqual(["a", "b"]);
    });

    it("size 反映待执行任务数，执行后归零", () => {
      const queue = createIdleQueue();
      expect(queue.size).toBe(0);
      queue.push(() => 1);
      queue.push(() => 2);
      expect(queue.size).toBe(2);
      ric.fire();
      expect(queue.size).toBe(0);
    });
  });

  describe("降级环境（无 requestIdleCallback）", () => {
    beforeEach(() => {
      vi.stubGlobal("requestIdleCallback", undefined);
      vi.stubGlobal("cancelIdleCallback", undefined);
      vi.useFakeTimers();
    });

    it("用 setTimeout 分批执行，timeSlice 预算内跑完多个任务", async () => {
      const queue = createIdleQueue();
      const results: number[] = [];
      const promises = [1, 2, 3].map((n) => queue.push(() => (results.push(n), n)));
      vi.advanceTimersByTime(1);
      await Promise.all(promises);
      expect(results).toEqual([1, 2, 3]);
      expect(queue.size).toBe(0);
    });

    it("timeSlice 耗尽时让路，剩余任务下一批执行", async () => {
      const queue = createIdleQueue({ timeSlice: 0 }); // 每批只执行一个任务
      const results: number[] = [];
      const promises = [1, 2].map((n) => queue.push(() => (results.push(n), n)));
      vi.advanceTimersByTime(1);
      expect(results).toEqual([1]);
      expect(queue.size).toBe(1);
      vi.advanceTimersByTime(1); // 重新调度的下一批
      await Promise.all(promises);
      expect(results).toEqual([1, 2]);
    });

    it("destroy() 清除降级定时器，任务不再执行", () => {
      const queue = createIdleQueue();
      const task = vi.fn(() => 1);
      queue.push(task).catch(() => {});
      queue.destroy();
      vi.advanceTimersByTime(1000);
      expect(task).not.toHaveBeenCalled();
    });
  });
});

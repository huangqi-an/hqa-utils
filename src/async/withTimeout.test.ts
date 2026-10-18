import { describe, expect, it } from "vitest";
import { sleep } from "./sleep.js";
import { TimeoutError, withTimeout } from "./withTimeout.js";

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

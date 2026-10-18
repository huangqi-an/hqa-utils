import { describe, expect, it } from "vitest";
import { sleep } from "./sleep.js";

describe("sleep", () => {
  it("在指定时间后 resolve", async () => {
    const start = Date.now();
    await sleep(30);
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });
});

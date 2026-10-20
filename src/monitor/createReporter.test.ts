// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReporter } from "./createReporter.js";
import type { CreateReporterOptions, Reporter, ReportEvent } from "./createReporter.js";

/** stub navigator.sendBeacon，返回排队结果，并捕获 (url, body) */
function stubBeacon(result: boolean): { beacon: ReturnType<typeof vi.fn>; calls: Array<[string, Blob]> } {
  const calls: Array<[string, Blob]> = [];
  const beacon = vi.fn((url: string, body: Blob) => {
    calls.push([url, body]);
    return result;
  });
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
  return { beacon, calls };
}

function removeBeacon(): void {
  delete (navigator as unknown as Record<string, unknown>).sendBeacon;
}

async function parseBlob(blob: Blob): Promise<unknown> {
  return JSON.parse(await blob.text());
}

describe("createReporter（数据上报）", () => {
  // 追踪本文件创建的 reporter：afterEach 统一 destroy，
  // 防止 visibilitychange/pagehide 监听器泄漏进后续用例（fake timers 全局共享）
  const created: Reporter[] = [];
  const makeReporter = (options: CreateReporterOptions): Reporter => {
    const reporter = createReporter(options);
    created.push(reporter);
    return reporter;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 200 })));
  });

  afterEach(() => {
    while (created.length > 0) created.pop()!.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    removeBeacon();
  });

  it("report 只入队，到达 flushInterval 后自动批量发送", async () => {
    const { beacon, calls } = stubBeacon(true);
    const reporter = makeReporter({ endpoint: "/collect", commonData: { appId: "web" } });

    reporter.report("click", { x: 1 });
    expect(reporter.pendingCount).toBe(1);
    expect(beacon).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(calls[0]?.[0]).toBe("/collect");
    const events = (await parseBlob(calls[0]![1])) as ReportEvent[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "click", payload: { x: 1 }, appId: "web" });
    expect(typeof events[0]!.timestamp).toBe("number");
  });

  it("队列达到 maxBatchSize 立即发送，不等间隔", async () => {
    const { beacon } = stubBeacon(true);
    const reporter = makeReporter({ endpoint: "/collect", maxBatchSize: 2, flushInterval: 0 });

    reporter.report("a");
    reporter.report("b");
    expect(beacon).toHaveBeenCalledTimes(1);
    const events = (await parseBlob(beacon.mock.calls[0]![1] as Blob)) as ReportEvent[];
    expect(events).toHaveLength(2);
  });

  it("sendBeacon 不可用时降级 fetch(keepalive)，带 Content-Type", async () => {
    removeBeacon();
    const reporter = makeReporter({ endpoint: "/collect", flushInterval: 0, maxBatchSize: 1 });
    reporter.report("pageview");

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/collect",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("sendBeacon 排队失败（返回 false）时降级 fetch", async () => {
    stubBeacon(false);
    const reporter = makeReporter({ endpoint: "/collect", flushInterval: 0, maxBatchSize: 1 });
    reporter.report("pageview");

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it("fetch 失败按 retries 重试，成功后不触发 onError", async () => {
    stubBeacon(false);
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();
    const reporter = makeReporter({
      endpoint: "/collect",
      flushInterval: 0,
      maxBatchSize: 1,
      retries: 1,
      onError,
    });

    reporter.report("pageview");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(onError).not.toHaveBeenCalled();
  });

  it("retries 耗尽后仍失败，onError 携带丢失的事件", async () => {
    stubBeacon(false);
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();
    const reporter = makeReporter({
      endpoint: "/collect",
      flushInterval: 0,
      maxBatchSize: 1,
      retries: 1,
      onError,
    });

    reporter.report("pageview", { uid: 7 });
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    const [error, events] = onError.mock.calls[0] as [unknown, ReportEvent[]];
    expect((error as Error).message).toBe("network down");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "pageview", payload: { uid: 7 } });
  });

  it("sampleRate: 0 时不采样（数据直接丢弃），sampleRate: 1 全量入队", () => {
    stubBeacon(true);
    const sampled = makeReporter({ endpoint: "/collect", sampleRate: 0 });
    sampled.report("a");
    expect(sampled.pendingCount).toBe(0);

    const full = makeReporter({ endpoint: "/collect", sampleRate: 1 });
    full.report("a");
    expect(full.pendingCount).toBe(1);
  });

  it("flushOnHide：页面进入后台（visibilitychange → hidden）自动 flush", async () => {
    const { beacon, calls } = stubBeacon(true);
    const reporter = makeReporter({ endpoint: "/collect", flushInterval: 0 });
    reporter.report("hidden-mark");
    expect(beacon).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(beacon).toHaveBeenCalledTimes(1);
    const events = (await parseBlob(calls[0]![1])) as ReportEvent[];
    expect(events[0]).toMatchObject({ event: "hidden-mark" });
  });

  it("pagehide（页面卸载）自动 flush", () => {
    const { beacon } = stubBeacon(true);
    const reporter = makeReporter({ endpoint: "/collect", flushInterval: 0 });
    reporter.report("unload-mark");
    window.dispatchEvent(new Event("pagehide"));
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it("flush() 手动发送，队列为空时不发送", () => {
    const { beacon } = stubBeacon(true);
    const reporter = makeReporter({ endpoint: "/collect", flushInterval: 0 });

    reporter.flush();
    expect(beacon).not.toHaveBeenCalled();

    reporter.report("x");
    reporter.flush();
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(reporter.pendingCount).toBe(0);
  });

  it("destroy：尽力发送剩余，之后 report 静默丢弃、定时停止", () => {
    const { beacon } = stubBeacon(true);
    const reporter = makeReporter({ endpoint: "/collect" });
    reporter.report("last");
    reporter.destroy();

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(reporter.pendingCount).toBe(0);
    expect(() => reporter.report("dropped")).not.toThrow();
    expect(reporter.pendingCount).toBe(0);

    vi.advanceTimersByTime(30000);
    expect(beacon).toHaveBeenCalledTimes(1); // 定时器已清
  });

  it("flushOnHide: false 不监听页面隐藏", () => {
    const { beacon } = stubBeacon(true);
    const reporter = makeReporter({ endpoint: "/collect", flushInterval: 0, flushOnHide: false });
    reporter.report("x");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(beacon).not.toHaveBeenCalled();
  });

  it("非浏览器环境：report 丢弃、flush/destroy 安全", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", undefined);
    const reporter = createReporter({ endpoint: "/collect" });
    expect(() => {
      reporter.report("ssr");
      reporter.flush();
      reporter.destroy();
    }).not.toThrow();
    expect(reporter.pendingCount).toBe(0);
  });
});

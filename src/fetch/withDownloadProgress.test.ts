import { afterEach, describe, expect, it, vi } from "vitest";
import { withDownloadProgress } from "./withDownloadProgress.js";
import type { DownloadProgress } from "./withDownloadProgress.js";

const encoder = new TextEncoder();

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function makeResponse(chunks: string[], headers?: Record<string, string>): Response {
  return new Response(streamFrom(chunks), headers ? { headers } : undefined);
}

describe("withDownloadProgress（fetch 下载进度）", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("流式聚合为 Blob，逐块回调进度", async () => {
    const onProgress = vi.fn();
    const blob = await withDownloadProgress(makeResponse(["he", "llo"], { "Content-Length": "5" }), onProgress);

    expect(await blob.text()).toBe("hello");
    expect(onProgress.mock.calls.map((c) => (c[0] as DownloadProgress).loaded)).toEqual([2, 5]);
    const last = onProgress.mock.calls.at(-1)![0] as DownloadProgress;
    expect(last.total).toBe(5);
    expect(last.percent).toBe(100);
  });

  it("Content-Type 透传为结果 Blob 的类型", async () => {
    const blob = await withDownloadProgress(
      makeResponse(["%PDF"], { "Content-Type": "application/pdf", "Content-Length": "4" }),
    );
    expect(blob.type).toBe("application/pdf");
  });

  it("无 Content-Length：total 与 percent 为 null，loaded 正常累计", async () => {
    const onProgress = vi.fn();
    const blob = await withDownloadProgress(makeResponse(["ab", "cd"]), onProgress);

    expect(await blob.text()).toBe("abcd");
    for (const call of onProgress.mock.calls) {
      const p = call[0] as DownloadProgress;
      expect(p.total).toBeNull();
      expect(p.percent).toBeNull();
    }
    expect((onProgress.mock.calls.at(-1)![0] as DownloadProgress).loaded).toBe(4);
  });

  it("gzip 陷阱：解压后字节超过 Content-Length 时 percent 收敛不超 100", async () => {
    const onProgress = vi.fn();
    // 头声称 5 字节（压缩后），实际流给出 10 字节（解压后）
    const blob = await withDownloadProgress(
      makeResponse(["12345", "67890"], { "Content-Length": "5" }),
      onProgress,
    );

    expect(await blob.text()).toBe("1234567890");
    for (const call of onProgress.mock.calls) {
      const p = call[0] as DownloadProgress;
      expect(p.percent).toBeLessThanOrEqual(100);
    }
    const last = onProgress.mock.calls.at(-1)![0] as DownloadProgress;
    expect(last.loaded).toBe(10); // loaded 保持真实字节数
    expect(last.percent).toBe(100);
  });

  it("body 为 null（204）时 resolve 空 Blob", async () => {
    const onProgress = vi.fn();
    const blob = await withDownloadProgress(new Response(null, { status: 204 }), onProgress);

    expect(blob.size).toBe(0);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect((onProgress.mock.calls[0]![0] as DownloadProgress).loaded).toBe(0);
  });

  it("流读取失败时 reject", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("partial"));
        controller.error(new Error("network reset"));
      },
    });
    await expect(withDownloadProgress(new Response(stream))).rejects.toThrow("network reset");
  });

  it("不传 onProgress 也正常工作", async () => {
    const blob = await withDownloadProgress(makeResponse(["ok"], { "Content-Length": "2" }));
    expect(await blob.text()).toBe("ok");
  });
});

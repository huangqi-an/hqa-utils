// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "./downloadFile.js";

describe("downloadFile", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it("字符串内容转 Blob 下载，anchor 带文件名并在点击后移除", () => {
    const ok = downloadFile("a,b,c", "data.csv", "text/csv");

    expect(ok).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/csv");
    expect(document.querySelector("a")).toBeNull(); // 点击后已移除
  });

  it("Blob 输入直接使用，不重复包装", () => {
    const blob = new Blob(["bin"], { type: "application/octet-stream" });
    const ok = downloadFile(blob, "file.bin");

    expect(ok).toBe(true);
    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    expect(blobArg).toBe(blob);
  });

  it("anchor 的 href / download 属性正确设置", () => {
    let captured: { href: string; download: string } | null = null;
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = originalCreate(tag);
      if (tag === "a") {
        el.addEventListener("click", () => {
          captured = { href: (el as HTMLAnchorElement).href, download: (el as HTMLAnchorElement).download };
        });
      }
      return el;
    }) as typeof document.createElement);

    downloadFile("content", "report.json", "application/json");
    expect(captured).toEqual({ href: "blob:mock-url", download: "report.json" });
  });

  it("默认 MIME 为 text/plain", () => {
    downloadFile("plain", "plain.txt");
    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    expect(blobArg.type).toBe("text/plain");
  });

  it("objectURL 在 1 秒后释放（防下载未开始被回收）", () => {
    vi.useFakeTimers();
    downloadFile("content", "f.txt");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("createObjectURL 抛错时返回 false 不抛出", () => {
    URL.createObjectURL = vi.fn(() => {
      throw new Error("quota");
    });
    expect(downloadFile("content", "f.txt")).toBe(false);
  });

  it("SSR（无 document）返回 false", () => {
    vi.stubGlobal("document", undefined);
    expect(downloadFile("content", "f.txt")).toBe(false);
  });
});

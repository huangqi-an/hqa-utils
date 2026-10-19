// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./copyText.js";

describe("copyText", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as Partial<Document>).execCommand;
  });

  it("clipboard API 可用时直接写入并返回 true，不走降级", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;

    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("clipboard 写入被拒时降级 execCommand 成功", async () => {
    const writeText = vi.fn(() => Promise.reject(new Error("denied")));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    document.execCommand = vi.fn(() => true);

    await expect(copyText("hello")).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    // 降级用完的 textarea 已移除
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("无 clipboard 且无 execCommand（默认 jsdom）返回 false", async () => {
    await expect(copyText("hello")).resolves.toBe(false);
  });

  it("execCommand 抛错时返回 false 不抛出", async () => {
    vi.stubGlobal("navigator", {}); // 无 clipboard
    document.execCommand = vi.fn(() => {
      throw new Error("not supported");
    });

    await expect(copyText("hello")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("execCommand 返回 false（复制被浏览器拒绝）时返回 false", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = vi.fn(() => false);

    await expect(copyText("hello")).resolves.toBe(false);
  });

  it("SSR（无 navigator）返回 false", async () => {
    vi.stubGlobal("navigator", undefined);
    await expect(copyText("hello")).resolves.toBe(false);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { whenDocumentVisible } from "./whenDocumentVisible.js";

function setVisibility(state: "visible" | "hidden"): void {
  // SSR 用例会把 document stub 掉，此时无需恢复
  if (typeof document === "undefined") return;
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

describe("whenDocumentVisible（等待页面可见）", () => {
  afterEach(() => {
    setVisibility("visible");
    vi.unstubAllGlobals();
  });

  it("已可见时立即 resolve", async () => {
    await expect(whenDocumentVisible()).resolves.toBeUndefined();
  });

  it("页面隐藏时挂起，变为可见后 resolve", async () => {
    setVisibility("hidden");
    let resolved = false;
    const promise = whenDocumentVisible().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await promise;
    expect(resolved).toBe(true);
  });

  it("非浏览器环境立即 resolve", async () => {
    vi.stubGlobal("document", undefined);
    await expect(whenDocumentVisible()).resolves.toBeUndefined();
  });
});

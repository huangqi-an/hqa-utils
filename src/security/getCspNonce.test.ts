// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCspNonce } from "./getCspNonce.js";

describe("getCspNonce（读取 CSP nonce）", () => {
  afterEach(() => {
    // SSR 用例会把 document stub 掉，这里需要守卫
    if (typeof document === "undefined") return;
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("从页面 script 元素的 nonce 读取", () => {
    document.head.innerHTML = `<script nonce="abc123"></script>`;
    expect(getCspNonce()).toBe("abc123");
  });

  it("从 style 元素的 nonce 读取", () => {
    document.head.innerHTML = `<style nonce="style456">p{}</style>`;
    expect(getCspNonce()).toBe("style456");
  });

  it("无元素 nonce 时从 meta CSP 的 script-src 解析", () => {
    document.head.innerHTML = `<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'nonce-meta789'; style-src 'self'">`;
    expect(getCspNonce()).toBe("meta789");
  });

  it("元素 nonce 优先于 meta CSP", () => {
    document.head.innerHTML = `<script nonce="from-element"></script>
      <meta http-equiv="Content-Security-Policy" content="script-src 'nonce-from-meta'">`;
    expect(getCspNonce()).toBe("from-element");
  });

  it("meta 存在但无 nonce 指令时返回 null", () => {
    document.head.innerHTML = `<meta http-equiv="Content-Security-Policy" content="script-src 'self'">`;
    expect(getCspNonce()).toBeNull();
  });

  it("什么都没有时返回 null", () => {
    expect(getCspNonce()).toBeNull();
  });

  it("meta 只解析 script-src 里的 nonce，不误取 style-src 的", () => {
    document.head.innerHTML = `<meta http-equiv="Content-Security-Policy"
      content="script-src 'self'; style-src 'nonce-style-only'">`;
    expect(getCspNonce()).toBeNull();
  });

  it("非浏览器环境返回 null", () => {
    vi.stubGlobal("document", undefined);
    expect(getCspNonce()).toBeNull();
  });
});

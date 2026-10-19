/**
 * 复制文本到剪贴板。
 *
 * 优先使用现代的 `navigator.clipboard.writeText`（要求 https 或 localhost）；
 * 不可用或被拒绝时降级为 `document.execCommand("copy")`（隐藏 textarea 方案）。
 * 非浏览器环境返回 `false`，全程不抛错。
 *
 * @param text 要复制的文本
 * @returns 是否复制成功
 *
 * @example
 * ```ts
 * const ok = await copyText("https://example.com/invite/abc");
 * ok ? showToast("已复制") : showToast("复制失败，请手动复制");
 * ```
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  const clipboard = navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      /* 权限被拒等情况，落入 execCommand 降级 */
    }
  }

  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return false;
  }
  try {
    let textarea: HTMLTextAreaElement | null = null;
    try {
      textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length); // iOS Safari 需要显式选区
      return document.execCommand("copy");
    } finally {
      textarea?.remove(); // 无论成功失败都清理，避免节点泄漏
    }
  } catch {
    return false;
  }
}

/**
 * 等待页面变为可见，返回 Promise。
 *
 * - 页面已可见时立即 resolve
 * - 页面隐藏时挂起，直到 `visibilitychange` 变为可见后 resolve
 * - 非浏览器环境（SSR）立即 resolve，避免服务端代码挂起
 *
 * 典型用途：把重计算 / 刷新类工作推迟到用户真正看向页面时再执行。
 * @example
 * await whenDocumentVisible();
 * refreshData();
 */
export function whenDocumentVisible(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") {
      resolve();
      return;
    }
    if (document.visibilityState === "visible") {
      resolve();
      return;
    }
    const handler = () => {
      if (document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", handler);
        resolve();
      }
    };
    document.addEventListener("visibilitychange", handler);
  });
}

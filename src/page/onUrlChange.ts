interface HookState {
  originalPushState: History["pushState"];
  originalReplaceState: History["replaceState"];
  listeners: Set<(url: string) => void>;
  lastUrl: string;
}

let hookState: HookState | null = null;

function notify(): void {
  if (!hookState) return;
  const url = location.href;
  if (url === hookState.lastUrl) return;
  hookState.lastUrl = url;
  // 拷贝一份再遍历，避免回调内订阅/取消导致遍历异常
  for (const listener of [...hookState.listeners]) {
    listener(url);
  }
}

function install(): void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  hookState = {
    originalPushState,
    originalReplaceState,
    listeners: new Set(),
    lastUrl: location.href,
  };
  history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
    const result = originalPushState.apply(this, args);
    notify();
    return result;
  };
  history.replaceState = function (
    this: History,
    ...args: Parameters<History["replaceState"]>
  ) {
    const result = originalReplaceState.apply(this, args);
    notify();
    return result;
  };
  window.addEventListener("popstate", notify);
}

function uninstall(): void {
  if (!hookState) return;
  history.pushState = hookState.originalPushState;
  history.replaceState = hookState.originalReplaceState;
  window.removeEventListener("popstate", notify);
  hookState = null;
}

/**
 * 订阅 URL 变化，SPA 路由跳转（`pushState` / `replaceState`）与浏览器前进后退（`popstate`）都能监听到。
 *
 * - 订阅时立即回调一次当前 URL
 * - URL 实际未变化时不重复回调（如 `push` 相同地址）
 * - 内部对 `pushState` / `replaceState` 做引用计数式包装：最后一个订阅者取消时还原原始方法
 * - 非浏览器环境返回 noop（SSR 安全）
 * @param callback URL 变化时的回调，参数为完整的 `location.href`
 * @returns 取消订阅函数
 * @example
 * // SPA 里同步更新页面标题 / 埋点上报
 * const stop = onUrlChange((url) => {
 *   document.title = titles[url] ?? "默认标题";
 *   trackPageView(url);
 * });
 */
export function onUrlChange(callback: (url: string) => void): () => void {
  if (
    typeof window === "undefined" ||
    typeof history === "undefined" ||
    typeof location === "undefined"
  ) {
    return () => {};
  }
  if (!hookState) install();
  hookState!.listeners.add(callback);
  callback(hookState!.lastUrl);
  return () => {
    if (!hookState) return;
    hookState.listeners.delete(callback);
    if (hookState.listeners.size === 0) uninstall();
  };
}

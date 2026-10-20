# page 页面可见性与 URL

页面可见性订阅、等待可见、URL 变化监听，全部 SSR 安全。

| 导出 | 说明 |
| --- | --- |
| `onVisibilityChange(cb)` | 页面可见性订阅 |
| `whenDocumentVisible()` | 等待页面变为可见（Promise） |
| `onUrlChange(cb)` | URL 变化监听（SPA 路由跳转也能监听） |

## onVisibilityChange(callback)

订阅页面可见性变化（`visibilitychange`），**订阅时立即同步回调当前状态**（与 `onNetworkChange` 语义一致）。非浏览器环境返回 noop。

```ts
import { onVisibilityChange } from "@huangqi_an/hqa-utils";

// 页面切走时暂停轮询，回来后恢复
const stop = onVisibilityChange((visible) => {
  if (visible) resumePolling();
  else pausePolling();
});
stop(); // 取消订阅
```

## whenDocumentVisible()

等待页面变为可见，返回 Promise：已可见时立即 resolve；隐藏时挂起到变为可见；非浏览器环境立即 resolve（避免服务端挂起）。

```ts
import { whenDocumentVisible } from "@huangqi_an/hqa-utils";

// 把重活推迟到用户真正看向页面时
await whenDocumentVisible();
refreshData();
```

## onUrlChange(callback)

订阅 URL 变化，**SPA 路由跳转（`pushState` / `replaceState`）与浏览器前进后退（`popstate`）都能监听到**。订阅时立即回调当前 URL；URL 实际未变化时不重复回调。内部对 history 方法做引用计数式包装，最后一个订阅者取消时还原。

```ts
import { onUrlChange } from "@huangqi_an/hqa-utils";

// SPA 里同步更新页面标题 / 埋点上报
const stop = onUrlChange((url) => {
  document.title = titles[url] ?? "默认标题";
  trackPageView(url);
});
stop(); // 取消订阅
```

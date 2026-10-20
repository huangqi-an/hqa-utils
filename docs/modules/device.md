# device 设备感知

网络状态与质量、媒体查询订阅、系统偏好查询，全部 SSR 安全。

| 导出 | 说明 |
| --- | --- |
| `onNetworkChange(cb)` | 在线/离线订阅 |
| `getConnectionInfo()` | 网络质量估算（弱网降级用） |
| `onMediaQueryChange(query, cb)` | 媒体查询订阅 |
| `prefersDarkScheme()` | 是否偏好深色配色 |
| `prefersReducedMotion()` | 是否要求减少动画 |

## onNetworkChange(cb)

订阅网络在线/离线状态变化，监听 window 的 `online` / `offline` 事件；**订阅时立即同步回调一次当前状态**。返回取消订阅函数；非浏览器环境返回空操作（SSR 安全）。

```ts
import { onNetworkChange } from "@huangqi_an/hqa-utils";

const unsubscribe = onNetworkChange((online) => {
  offlineTip.hidden = online;
});
// 组件卸载时
unsubscribe();
```

## getConnectionInfo()

获取网络质量信息（Network Information API）：`effectiveType` / `downlink` / `rtt` / `saveData` 估算值，适合弱网降级。仅 Chromium 系支持，Safari / Firefox 及非浏览器环境返回 `null`。

```ts
import { getConnectionInfo } from "@huangqi_an/hqa-utils";

const conn = getConnectionInfo();
if (conn?.saveData || conn?.effectiveType === "2g") {
  loadThumbnailInstead();
}
```

## onMediaQueryChange(query, cb)

订阅媒体查询匹配状态变化（`matchMedia` + change 事件），**订阅时立即同步回调一次当前匹配状态**；兼容旧版 Safari 的 `addListener`。非浏览器环境返回空操作（SSR 安全）。

```ts
import { onMediaQueryChange } from "@huangqi_an/hqa-utils";

const unsubscribe = onMediaQueryChange("(prefers-color-scheme: dark)", (dark) => {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
});
// 组件卸载时
unsubscribe();
```

## prefersDarkScheme() / prefersReducedMotion()

系统偏好的一次性查询：是否偏好深色配色（`(prefers-color-scheme: dark)`）、是否要求减少动画（`(prefers-reduced-motion: reduce)`）。适合作为初始值判断；需要响应系统实时切换时配合 `onMediaQueryChange` 使用。非浏览器环境返回 `false`。

```ts
import { prefersDarkScheme, prefersReducedMotion } from "@huangqi_an/hqa-utils";

const theme = prefersDarkScheme() ? "dark" : "light";
const duration = prefersReducedMotion() ? 0 : 300;
```

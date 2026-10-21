# permission 权限查询

浏览器权限状态（Permissions API）的查询、监听与通知授权申请。

| 导出 | 说明 |
| --- | --- |
| `queryPermission(name)` | 查询权限状态（不触发授权弹窗） |
| `onPermissionChange(name, callback)` | 监听权限变化（订阅即回调当前状态） |
| `requestNotificationPermission()` | 申请通知授权（Promise 封装） |

## queryPermission(name)

查询浏览器权限状态。调用定位 / 通知 / 摄像头 / 剪贴板等敏感 API 前先查状态：`granted` 直接用、`denied` 引导去设置开启（浏览器不会再弹窗）、`prompt` 此时调用才会弹授权框。

```ts
import { queryPermission } from "@huangqi_an/hqa-utils";

const state = await queryPermission("geolocation");
if (state === "granted") locate();
else if (state === "denied") showSetupGuide();
else requestLocate(); // "prompt"
```

- 未知权限名（各浏览器支持不一，如 Firefox 无 camera、Safari 更少）原生抛 TypeError——已捕获降级返回 `null`，可放心对多个权限名并发查询
- SSR 或浏览器不支持 Permissions API 时返回 `null`

## onPermissionChange(name, callback)

监听权限状态变化：订阅时先回调一次当前状态，之后用户在浏览器设置里改动权限（通常切回标签页时派发 change）时再次回调。denied 时展示引导，用户改完回来 UI 自动切换。

```ts
import { onPermissionChange } from "@huangqi_an/hqa-utils";

const stop = onPermissionChange("notifications", (state) => {
  banner.update(state);
});

stop(); // 组件卸载时取消
```

- 未知权限名静默不回调，返回可用的取消函数
- SSR 返回 noop

## requestNotificationPermission()

申请通知授权（`Notification.requestPermission()` 的 Promise 封装）。注意：**只有通知是"纯申请"语义**——定位 / 摄像头 / 剪贴板的申请动作就是业务 API 调用本身（如 `getCurrentPosition` 既弹窗又给数据），不需要单独的申请封装。

```ts
import { requestNotificationPermission, onPermissionChange } from "@huangqi_an/hqa-utils";

const result = await requestNotificationPermission();
if (result === "granted") {
  new Notification("已开启提醒");
} else if (result === "default") {
  // 用户关掉了弹窗，别打扰，留个入口就好
}

// 跟随后续变化（用户可能随时在设置里改主意）
onPermissionChange("notifications", (state) => syncBanner(state));
```

- 已授权 / 已拒绝时再次调用**不会弹窗**，直接返回当前状态
- 结果为 `"granted"` / `"denied"` / `"default"`（用户关掉弹窗未选择）
- 旧版 Safari 回调式签名已兼容；SSR 返回 `null`

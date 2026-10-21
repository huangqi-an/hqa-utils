# permission 权限查询

浏览器权限状态（Permissions API）的查询与监听。

| 导出 | 说明 |
| --- | --- |
| `queryPermission(name)` | 查询权限状态（不触发授权弹窗） |
| `onPermissionChange(name, callback)` | 监听权限变化（订阅即回调当前状态） |

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

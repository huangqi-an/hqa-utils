# mouse 鼠标工具

鼠标位置跟踪、长按检测、空闲检测与精确指针支持。

| 导出 | 说明 |
| --- | --- |
| `getMousePosition()` | 获取最近鼠标位置 |
| `onMousePositionChange(cb)` | 订阅鼠标位置变化 |
| `onLongPress(el, callback, options?)` | 长按检测 |
| `onMouseIdle(callback, ms, options?)` | 鼠标空闲检测 |
| `isMouseSupported()` | 是否拥有鼠标类精确指针 |

## getMousePosition() / onMousePositionChange(cb)

鼠标位置跟踪：获取最近位置 + 订阅变化（mousemove 驱动，视口坐标）。

```ts
import { getMousePosition, onMousePositionChange } from "@huangqi_an/hqa-utils";

const off = onMousePositionChange(({ x, y }) => {
  console.log(x, y);
});

off(); // 取消订阅

// 仅当存在活跃订阅时才有值，否则为 null
const pos = getMousePosition();
```

- 全局仅维护一个 mousemove 监听器：首个订阅时绑定，最后一个订阅取消时解绑
- mousemove 是高频事件，回调内请自行节流

## onLongPress(el, callback, options?)

长按检测，基于 Pointer Events（鼠标长按与触屏长按均可触发）。

```ts
import { onLongPress } from "@huangqi_an/hqa-utils";

const stop = onLongPress(
  el,
  (event) => console.log("长按触发", event.clientX),
  { delay: 800, once: true },
);

stop(); // 停止监听
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `delay` | `600` | 触发长按的等待时长（ms） |
| `once` | `false` | 触发一次后是否自动停止监听 |

- 按下期间松开（pointerup / pointercancel）或指针移出元素（pointerleave）会取消本次计时
- 触屏长按可能同时触发浏览器原生行为（如菜单），如需屏蔽请在业务侧处理

## onMouseIdle(callback, ms, options?)

鼠标空闲检测：无 mousemove / mousedown 达到阈值后触发一次回调。

```ts
import { onMouseIdle } from "@huangqi_an/hqa-utils";

// 用户 30 秒无操作后暂停自动轮播
const stop = onMouseIdle(() => carousel.pause(), 30_000);
```

- 任何活动都会重置计时；触发后自动停止监听（一次性语义），循环检测请在回调内重新调用
- `options.target` 可指定监听目标（默认 `window`）

## isMouseSupported()

检测设备是否拥有鼠标类精确指针，基于 `(pointer: fine)` 媒体查询。

```ts
import { isMouseSupported } from "@huangqi_an/hqa-utils";

if (isMouseSupported()) {
  // 显示 hover 提示、右键菜单等仅鼠标可用的交互
}
```

- 主输入设备为触屏（手机 / 平板）时返回 `false`；不支持 matchMedia 的旧浏览器返回 `false`

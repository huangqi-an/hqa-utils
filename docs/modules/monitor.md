# monitor 页面健康监测

白屏检测：采样点检测原语与轮询监测。

| 导出 | 说明 |
| --- | --- |
| `isPageBlank(options?)` | 检测当前页面是否白屏（一次性） |
| `onBlankScreen(callback, options?)` | 白屏轮询监测（连续计数防抖） |

## isPageBlank(options?)

白屏检测（采样点方案）：视口 3x3 九宫格取 9 个采样点，每个点用 `document.elementsFromPoint` 取该坐标从上到下命中的元素链——链上全是 `html` / `body` 或容器白名单元素（SPA 挂载根的"空壳"）即为白点；白点占比超过 `threshold` 判定白屏。适合 JS 报错 / 渲染失败导致整页空白的监控上报，检测时机由调用方决定。

```ts
import { isPageBlank } from "@huangqi_an/hqa-utils";

// 路由切换渲染完成后检测
const { blank, blankCount, total } = isPageBlank();
if (blank) report("白屏", { blankCount, total });
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `containers` | `[]` | 额外容器白名单选择器（默认已含 `#root` / `#app` / `#__next`）；想连骨架屏一起判白可加骨架选择器 |
| `threshold` | `0.9` | 白点比例阈值（0~1），调低更敏感、调高更保守 |

- 返回 `{ blank, blankCount, total }`，明细可随监控上报
- 边界：纯 CSS 背景图会被判为白（背景不是元素）；不穿透 iframe 与 Shadow DOM
- SSR 或环境不支持 `elementsFromPoint` 时返回 `blank: false`（无法判定不误报）

## onBlankScreen(callback, options?)

白屏轮询监测：按间隔反复调用 `isPageBlank`，连续白屏达到 `consecutive` 次后回调一次。持续白屏期间只回调一次，恢复非白后计数重置，再次连续白屏才会再次触发（防刷屏）。

```ts
import { onBlankScreen } from "@huangqi_an/hqa-utils";

const stop = onBlankScreen((result) => {
  report("连续白屏", result);
}, { interval: 2000, consecutive: 3 });

stop(); // 组件卸载时停止
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `interval` | `2000` | 检测间隔（毫秒） |
| `consecutive` | `3` | 连续白屏多少次才触发（防瞬时抖动误报） |
| `immediate` | `true` | 订阅时立即做首次检测 |

- 非浏览器环境（SSR）返回 noop

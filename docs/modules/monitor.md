# monitor 页面健康监测

白屏检测、帧率与数据上报：采样点检测原语、轮询监测、上报器。

| 导出 | 说明 |
| --- | --- |
| `isPageBlank(options?)` | 检测当前页面是否白屏（一次性） |
| `onBlankScreen(callback, options?)` | 白屏轮询监测（连续计数防抖） |
| `onFpsChange(callback, options?)` | 帧率持续监测（rAF 计数） |
| `measureFps(options?)` | 一次性帧率测量（Promise） |
| `createReporter(options)` | 数据上报器（批量 / 采样 / 卸载不丢） |

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

## createReporter(options)

数据上报器：批量合并 + 采样 + `sendBeacon` 优先 / `fetch(keepalive)` 降级。解决裸用上报 API 的三个痛点——页面卸载时 `fetch` 被浏览器掐断丢数据、JSON 直发触发 CORS 预检、高频埋点无批量。

```ts
import { createReporter, isPageBlank } from "@huangqi_an/hqa-utils";

const reporter = createReporter({
  endpoint: "/api/collect",
  commonData: { appId: "web", version: "1.0.0" },
});

// 与白屏检测配合
const result = isPageBlank();
if (result.blank) reporter.report("白屏", result);

reporter.report("js-error", { message: "..." });
reporter.destroy(); // 页面退出前调用，尽力发完剩余
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `endpoint` | - | 采集端点 URL（POST 接收 JSON 数组） |
| `flushInterval` | `5000` | 自动 flush 间隔（毫秒），`0` 关闭定时 flush |
| `maxBatchSize` | `20` | 队列达到多少条立即发送 |
| `sampleRate` | `1` | 采样率 0~1，入队时判定，未采样直接丢弃 |
| `retries` | `0` | fetch 降级路径的重试次数（`sendBeacon` 无响应不重试） |
| `contentType` | `"application/json"` | 请求体类型；可用 `text/plain;charset=UTF-8` 规避 CORS 预检 |
| `headers` | - | 附加请求头（仅 fetch 降级路径携带） |
| `commonData` | - | 合并进每条事件的公共字段 |
| `flushOnHide` | `true` | 页面进入后台或卸载时自动 flush（防丢数据的关键） |
| `onError` | - | fetch 重试耗尽仍失败时回调，携带丢失的事件 |

- 发送策略：优先 `navigator.sendBeacon`（异步不阻塞、卸载时浏览器仍尽力送达），不可用或排队失败降级 `fetch` + `keepalive: true`
- 边界：`sendBeacon` 与 `keepalive` 均有约 64KB 请求体限制，超大负载请拆分；`sendBeacon` 无响应，感知不到服务端错误
- SSR 安全：`report` 静默丢弃、`flush` / `destroy` 空操作

## onFpsChange(callback, options?)

持续监测页面帧率（FPS）：基于 requestAnimationFrame 逐帧计数，每个采样窗口回调一次平均帧率。动画 / 游戏页面的卡顿监控原语，阈值判断（如 `fps < 30`）由调用方决定。

```ts
import { onFpsChange } from "@huangqi_an/hqa-utils";

const stop = onFpsChange(({ fps, frames }) => {
  if (fps < 30) reporter.report("卡顿", { fps, frames });
});

stop(); // 组件卸载时停止
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `interval` | `1000` | 采样窗口毫秒数 |

- 回调参数 `{ fps, frames, elapsed }`：平均帧率（取整）、窗口内帧数、窗口实际耗时
- 后台标签页（rAF 被暂停）或窗口内无帧时跳过结算，不上报无意义的 0
- 内部复用 `schedule.onRafLoop`；SSR 返回 noop

## measureFps(options?)

一次性测量帧率：采样 `duration` 毫秒后 resolve 平均帧率，适合按需测量（重交互页面前后对比）而非挂机监测。

```ts
import { measureFps } from "@huangqi_an/hqa-utils";

const sample = await measureFps({ duration: 1000 });
if (sample && sample.fps < 30) reporter.report("卡顿", sample);
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `duration` | `1000` | 采样时长毫秒数 |

- 内部基于 `onFpsChange`；SSR 环境 resolve `null` 不挂起

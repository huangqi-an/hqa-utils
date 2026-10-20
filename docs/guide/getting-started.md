# 快速开始

## 安装

```bash
npm install @huangqi_an/hqa-utils
```

## 使用

所有导出都从包根导入，ESM 与 CJS 双格式开箱即用：

```ts
// ESM
import { withTimeout, retry, debounce } from "@huangqi_an/hqa-utils";

// 带超时的请求 + 失败自动重试
const data = await retry(
  () => withTimeout(fetch("/api/data").then((r) => r.json()), 3000),
  { retries: 3, backoff: "exponential" },
);
```

```js
// CJS (Node.js)
const { parseQuery } = require("@huangqi_an/hqa-utils");

parseQuery("?a=1&b=hello+world"); // { a: "1", b: "hello world" }
```

## 特性

- **零依赖**：不引入任何第三方运行时依赖，gzip 后约 9 KB
- **框架无关**：纯 TypeScript 函数，React / Vue / Svelte / 原生均可使用
- **SSR 安全**：所有浏览器 API 均有环境守卫，非浏览器环境返回降级值不抛错
- **tree-shaking 友好**：一个功能一个文件，只打包用到的部分
- **双格式**：ESM + CJS + 完整类型声明（d.ts）

## 模块总览

| 模块 | 说明 |
| --- | --- |
| [`async`](/modules/async) | 异步工具：`sleep`、`withTimeout`、`retry`、`pLimit`、`runWithLimit`、`pollUntil` |
| [`client`](/modules/client) | 客户端信息：环境守卫、UA 解析、平台检测、`getClientInfo` |
| [`device`](/modules/device) | 设备感知：网络状态/质量、媒体查询、系统偏好 |
| [`dom`](/modules/dom) | DOM 小件：`copyText`、`onElementVisible`、`onElementResize`、`downloadFile` |
| [`mouse`](/modules/mouse) | 鼠标工具：位置跟踪、长按、空闲检测、精确指针支持 |
| [`page`](/modules/page) | 页面可见性与 URL：`onVisibilityChange`、`whenDocumentVisible`、`onUrlChange` |
| [`preload`](/modules/preload) | 资源预加载：`preloadResource`、`preconnectTo`、`preloadImage`、`prefetchWhenIdle` |
| [`schedule`](/modules/schedule) | 调度工具：`raf`、`rafThrottle`、`onRafLoop`、`whenIdle`、`createIdleQueue` |
| [`scroll`](/modules/scroll) | 滚动小件：进度查询、平滑滚动、无限加载、方向监听、停止监听 |
| [`storage`](/modules/storage) | 存储封装：`createStorage`（TTL 过期 / 命名空间 / 版本迁移 / SSR 安全） |
| [`timing`](/modules/timing) | 定时控制：`debounce`、`throttle`（leading/trailing/cancel/flush） |
| [`url`](/modules/url) | 查询参数操作：`parseQuery`、`buildUrl`、`updateSearchParams`、`replaceQueryState` |

## 通用约定

- **订阅返回取消函数**：所有 `onXxx` 订阅类 API 返回 `() => void`，组件卸载时调用
- **SSR 降级一致**：非浏览器环境下查询类返回 `null` / `false` / `0`，订阅类返回 noop，构建类为空操作
- **错误显式化**：可预期的失败（超时、次数用尽、配额满）用语义化错误类或 `false` / `null` 表达，不抛神秘异常

## 开发

```bash
npm install            # 安装依赖
npm test               # 运行测试
npm run test:coverage  # 测试 + 覆盖率
npm run lint           # 代码检查
npm run typecheck      # 类型检查
npm run build          # 构建（ESM + CJS + d.ts）
npm run docs:dev       # 本地起文档站
npm run docs:build     # 构建文档站
```

## 发版

推送 `v*` tag 触发 CI 自动发布（lint → test → build → npm publish + GitHub Release）：

```bash
npm version 0.5.0
git push origin main v0.5.0
```

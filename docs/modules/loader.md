# loader 资源加载

动态加载脚本 / 样式表与等待元素出现：第三方 SDK 按需加载三件套。

| 导出 | 说明 |
| --- | --- |
| `loadScript(url, options?)` | 动态加载脚本（去重缓存 / 失败可重试 / 超时） |
| `loadStyle(url, options?)` | 动态加载样式表（与 loadScript 共享注入实现） |
| `waitForElement(selector, options?)` | 等待匹配选择器的元素出现（MutationObserver） |

## loadScript(url, options?) / loadStyle(url, options?)

动态加载外部脚本 / 样式表：创建 `<script>` / `<link rel="stylesheet">` 标签插入页面，加载完成 resolve。第三方 SDK 按需加载（地图 / 图表 / 支付组件）的标准姿势。

```ts
import { loadScript, loadStyle } from "@huangqi_an/hqa-utils";

await loadScript("https://maps.example.com/api.js", { timeout: 10000 });
window.initMap?.();

await loadStyle("https://cdn.example.com/dark-theme.css");
document.body.classList.add("dark");
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `attrs` | - | 附加属性（`integrity` / `crossOrigin` / `media` 等）；URL 相关属性（`src` / `href` / `rel`）不可覆盖 |
| `parent` | `document.head` | 插入的父容器 |
| `timeout` | `0` | 超时毫秒数，超时以 `TimeoutError` reject；`0` 不超时 |

- **去重缓存**：同 URL 的并发调用与后续调用共享同一次加载，不插重复标签
- **失败可重试**：失败清缓存，下次调用重新加载
- SSR resolve 空操作

## waitForElement(selector, options?)

等待匹配选择器的元素出现：已存在立即 resolve，否则用 MutationObserver 监听 DOM 变化。等第三方脚本渲染组件、等弹窗节点挂载后再操作，比轮询查询干净且及时。

```ts
import { loadScript, waitForElement } from "@huangqi_an/hqa-utils";

// 等第三方 SDK 加载并渲染出组件，再拿引用操作
await loadScript("https://widget.example.com/embed.js");
const widget = await waitForElement(".third-party-widget", { timeout: 5000 });
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `root` | `document` | 查找的根节点 |
| `timeout` | `0` | 超时毫秒数，超时以 `TimeoutError` reject；`0` 不超时 |

- SSR resolve `null`，不挂起服务端

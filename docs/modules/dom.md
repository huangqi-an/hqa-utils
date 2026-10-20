# dom DOM 小件

剪贴板、元素可见性/尺寸观察、事件委托、文件下载。

| 导出 | 说明 |
| --- | --- |
| `copyText(text)` | 复制文本到剪贴板（带降级） |
| `onElementVisible(el, callback, options?)` | 元素进入/离开视口订阅 |
| `onElementResize(el, callback)` | 元素尺寸变化订阅 |
| `onDelegate(root, type, selector, listener, options?)` | 根元素事件委托 |
| `downloadFile(data, filename, mime?)` | 触发浏览器下载 |

## copyText(text)

复制文本到剪贴板：优先 `navigator.clipboard`（要求 https 或 localhost），不可用或被拒时降级 `execCommand`，SSR 返回 `false`。

```ts
import { copyText } from "@huangqi_an/hqa-utils";

const ok = await copyText("https://example.com/invite/abc");
ok ? showToast("已复制") : showToast("复制失败，请手动复制");
```

## onElementVisible(el, callback, options?)

元素进入 / 离开视口时触发，基于 IntersectionObserver，适合曝光埋点、懒加载、入场动画。

```ts
import { onElementVisible } from "@huangqi_an/hqa-utils";

const stop = onElementVisible(card, (entry) => {
  if (entry.isIntersecting) report("曝光", { id: card.dataset.id });
}, { threshold: 0.5, once: true });

stop(); // 取消观察
```

- `threshold`：交叉比例阈值 0~1（默认 `0`，任意可见即触发）
- `once`：进入视口触发一次后自动停止（默认 `false`）
- 回调参数为原生 `IntersectionObserverEntry`

## onElementResize(el, callback)

元素自身尺寸变化时触发，基于 ResizeObserver。`window.resize` 只响应窗口变化，元素因内容 / 布局变化导致的尺寸变化只有它能捕获。

```ts
import { onElementResize } from "@huangqi_an/hqa-utils";

const stop = onElementResize(chartContainer, ({ width, height }) => {
  chart.resize({ width, height });
});
```

- 回调参数为内容区尺寸（不含 padding / border）
- 不支持 ResizeObserver 的环境返回 noop

## onDelegate(root, type, selector, listener, options?)

在根元素上进行事件委托：事件冒泡到 `root` 后按 `closest(selector)` 匹配实际目标。动态列表只绑定一次，子元素随便增删，新增项自动生效。

```ts
import { onDelegate } from "@huangqi_an/hqa-utils";

const stop = onDelegate(document, "click", ".item", (event, item) => {
  console.log("点击了", (item as HTMLElement).dataset.id);
});

stop(); // 组件卸载时取消
```

- 回调第二参数 `matched` 直接给出匹配到的元素（可能是 target 自身或其祖先），省去回调内再 `closest` 一次
- `capture` 选项透传给原生监听，`focus` / `blur` 等不冒泡事件需传 `true`
- 不穿透 Shadow DOM（冒泡出 shadow root 后 target 已被重定向），需要时请基于 `composedPath()` 自行实现
- SSR 或 `root` 无效时返回 noop

## downloadFile(data, filename, mime?)

触发浏览器下载：接收 Blob 或文本内容（导出 CSV / JSON 报表），内部 objectURL + `a[download]` 实现，1 秒后自动释放 objectURL。

```ts
import { downloadFile } from "@huangqi_an/hqa-utils";

downloadFile(JSON.stringify(data), "report.json", "application/json");
downloadFile(csvText, "订单列表.csv", "text/csv");
```

- SSR 返回 `false`；下载远程 URL 直接用 `a[href][download]` 即可，无需本函数

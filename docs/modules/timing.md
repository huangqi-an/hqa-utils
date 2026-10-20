# timing 定时控制

防抖与节流，lodash 语义，返回函数附带 `cancel()` / `flush()`。

| 导出 | 说明 |
| --- | --- |
| `debounce(fn, wait, options?)` | 防抖：停下来再执行 |
| `throttle(fn, wait, options?)` | 节流：固定节拍执行 |

## debounce(fn, wait, options?)

防抖：将高频调用合并为"停止触发 `wait` 毫秒后"的一次执行（取最后一次参数）。每次调用都重置等待计时，适合搜索联想、resize 结束后重算布局等"等停下来再执行"的场景。返回函数附带 `cancel()` 取消挂起调用、`flush()` 立即执行挂起调用；`this` 与参数透传。

```ts
import { debounce } from "@huangqi_an/hqa-utils";

const onSearch = debounce((keyword: string) => {
  fetchSuggestions(keyword);
}, 300);

input.addEventListener("input", (e) => onSearch(e.target.value));
// 组件卸载时
onSearch.cancel();
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `leading` | `false` | 防抖周期内首次调用是否立即执行 |
| `trailing` | `true` | 静默期结束后是否以最后一次参数补执行 |

## throttle(fn, wait, options?)

节流：将高频调用限制为每 `wait` 毫秒最多执行一次，持续触发期间保持固定节拍（不重置计时），默认周期首立即执行、周期末补执行最新参数。

```ts
import { throttle } from "@huangqi_an/hqa-utils";

const onScroll = throttle(() => {
  updateHeaderShadow(window.scrollY);
}, 100);

window.addEventListener("scroll", onScroll);
// 组件卸载时
onScroll.cancel();
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `leading` | `true` | 周期开始时是否立即执行 |
| `trailing` | `true` | 周期结束时是否以最后一次参数补执行 |

与 [`schedule.rafThrottle`](/modules/schedule#rafthrottle-fn) 的区别：`throttle` 以时间窗口为基准，适合与渲染节奏无关的频率限制（网络请求、埋点上报）；`rafThrottle` 以渲染帧为基准，适合高频事件驱动渲染。

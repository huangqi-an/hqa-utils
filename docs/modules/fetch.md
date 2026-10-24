# fetch 辅助

fetch 场景的补充能力：下载进度。

| 导出 | 说明 |
| --- | --- |
| `withDownloadProgress(response, onProgress?)` | 流式消费 Response body，报告下载进度，resolve 聚合的 Blob |

## withDownloadProgress(response, onProgress?)

fetch 下载进度：fetch 本身没有进度事件（那是 XHR 的能力），下载进度只能靠 `response.body`（ReadableStream）逐块读取——本函数封装这段样板，接收 `fetch` 返回的 `Response`，流式聚合并回调进度，最终 resolve `Blob`。

```ts
import { withDownloadProgress } from "@huangqi_an/hqa-utils";

const res = await fetch("/large-file.zip");
if (!res.ok) throw new Error(`HTTP ${res.status}`);

const blob = await withDownloadProgress(res, ({ percent }) => {
  bar.update(percent ?? 0);
});
```

- 进度 `{ loaded, total, percent }`：`total` 来自 `Content-Length`（chunked 响应缺失时为 `null`，只报 `loaded`）
- **gzip 口径陷阱已处理**：`Content-Length` 是压缩后尺寸、流读到的是解压后字节，两者不一致会让进度超 100%——`percent` 已收敛 ≤ 100（`loaded` 保持真实值）
- 不校验 `response.ok`（fetch 惯例，调用方决定）；中断下载用 fetch 的 `AbortSignal`，读流失败会 reject
- 上传进度 fetch 做不了（平台限制），大文件上传的正确姿势是 XHR/axios 分片

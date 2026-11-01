/**
 * 下载进度快照。
 */
export interface DownloadProgress {
  /** 已接收的字节数（解压后口径） */
  loaded: number;
  /** 总字节数（来自 Content-Length，响应头缺失或非法时为 `null`） */
  total: number | null;
  /** 进度百分比 0~100；`total` 未知时为 `null` */
  percent: number | null;
}

/**
 * withDownloadProgress 的配置项。
 */
export interface WithDownloadProgressOptions {
  /**
   * 从哪个响应头读取总字节数，默认 `"Content-Length"`。
   * 后端把真实文件大小放在自定义头（如 `"X-Total-Length"`）时指定它。
   */
  totalHeader?: string;
  /**
   * 直接指定总字节数，优先级高于 `totalHeader`。
   * total 不在任何响应头里的场景（分片下载前端自己算好了）用这个。
   */
  total?: number;
}

/**
 * 以流式方式消费一个 fetch Response 的 body，并通过回调报告下载进度，
 * 最终 resolve 聚合完成的 `Blob`。
 *
 * fetch 本身没有进度事件（那是 XHR 的能力），下载进度只能靠
 * `response.body`（ReadableStream）逐块读取。本函数用 TransformStream
 * 在管道中计数，并处理两个真实的坑：
 * - **无 Content-Length**（chunked 响应）→ `total` / `percent` 为 `null`，只报 `loaded`
 * - **gzip 压缩陷阱**：`Content-Length` 是压缩后尺寸，流读到的是解压后字节，
 *   两者口径不同会导致进度超 100% → `percent` 已收敛到 ≤ 100（`loaded` 保持真实值）
 *
 * 响应头 `Content-Type` 会透传为结果 Blob 的类型。
 * 不校验 `response.ok`——是否把非 2xx 视为错误由调用方决定（fetch 惯例）；
 * `response.body` 为 `null`（如 204）时 resolve 空 Blob。
 *
 * 需要中断下载时，在发起 fetch 时传 `AbortSignal`，这里会以读流错误 reject。
 *
 * @param response fetch 返回的 Response
 * @param onProgress 每收到一个数据块时回调一次
 * @param options 配置项（总长度的来源）
 * @returns 聚合完成的 Blob（Content-Type 沿用响应头）
 *
 * @example
 * ```ts
 * const res = await fetch("/large-file.zip");
 * if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *
 * const blob = await withDownloadProgress(res, ({ percent }) => {
 *   bar.update(percent ?? 0); // total 未知时 percent 为 null
 * });
 *
 * saveAs(blob, "large-file.zip");
 * ```
 *
 * @example
 * ```ts
 * // 总长度不在 Content-Length：后端自定义头
 * withDownloadProgress(res, onProgress, { totalHeader: "X-Total-Length" });
 *
 * // total 根本不在响应头里（分片场景前端自己算好了）：直接传数值
 * withDownloadProgress(res, onProgress, { total: file.size });
 * ```
 */
export async function withDownloadProgress(
  response: Response,
  onProgress?: (progress: DownloadProgress) => void,
  options?: WithDownloadProgressOptions,
): Promise<Blob> {
  const { totalHeader = "Content-Length", total: explicitTotal } = options ?? {};

  let total: number | null = null;
  if (typeof explicitTotal === "number" && Number.isFinite(explicitTotal) && explicitTotal >= 0) {
    total = explicitTotal; // 显式数值优先（total 不在响应头里的场景）
  } else {
    const lengthHeader = response.headers.get(totalHeader);
    const parsed = lengthHeader === null ? NaN : Number(lengthHeader);
    total = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  const report = (loaded: number): void => {
    if (!onProgress) return;
    onProgress({
      loaded,
      total,
      percent: total && total > 0 ? Math.min((loaded / total) * 100, 100) : null,
    });
  };

  // body 为 null（204 等）：空内容即完成
  if (!response.body) {
    report(0);
    return new Blob([], { type: response.headers.get("Content-Type") ?? "" });
  }

  let loaded = 0;
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      loaded += chunk.byteLength;
      report(loaded);
      controller.enqueue(chunk); // 原样透传
    },
  });

  return new Response(response.body.pipeThrough(counter), {
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "" },
  }).blob();
}

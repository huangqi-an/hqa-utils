/**
 * 支持的 `<link rel="preload">` 资源类型（即 `as` 属性的合法取值）。
 */
export type PreloadAs =
  | "audio"
  | "document"
  | "embed"
  | "fetch"
  | "font"
  | "image"
  | "object"
  | "script"
  | "style"
  | "track"
  | "video"
  | "worker";

export interface PreloadResourceOptions {
  /**
   * 资源类型。不传时按 URL 扩展名推断，推断不出会抛出 `RangeError`。
   */
  as?: PreloadAs;
  /**
   * 跨域模式。`font` 类型不传时默认 `"anonymous"`——按 HTML 规范，
   * 字体必须以 CORS 模式预加载，否则预加载结果不会被复用，造成二次下载。
   */
  crossOrigin?: "anonymous" | "use-credentials";
}

/** 扩展名 → as 类型推断表 */
const EXT_TO_AS: Record<string, PreloadAs> = {
  js: "script",
  mjs: "script",
  css: "style",
  woff: "font",
  woff2: "font",
  ttf: "font",
  otf: "font",
  eot: "font",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  svg: "image",
  ico: "image",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  flac: "audio",
  mp4: "video",
  webm: "video",
  mov: "video",
  vtt: "track",
  json: "fetch",
  wasm: "fetch",
};

/** 从 URL 提取小写扩展名（剥离 query 与 hash） */
function extractExt(url: string): string {
  const path = url.split(/[?#]/, 1)[0] ?? "";
  const dot = path.lastIndexOf(".");
  if (dot === -1 || dot === path.length - 1) return "";
  return path.slice(dot + 1).toLowerCase();
}

/** 模块级去重缓存：key 为 `${as}:${url}`，value 为进行中/已成功的 Promise */
const pending = new Map<string, Promise<void>>();

/**
 * 动态插入 `<link rel="preload">` 预加载资源，加载成功时 resolve，失败时 reject。
 *
 * 相同 `as` 与 URL 的重复调用会复用进行中的预加载（返回同一个 Promise），
 * 不会重复插入 link 标签；此前预加载失败的资源再次调用会重新发起。
 *
 * @param url - 资源地址
 * @param options - `as` 类型与跨域模式，见 {@link PreloadResourceOptions}
 * @throws 未传 `as` 且无法从扩展名推断时抛出 `RangeError`
 *
 * @example
 * ```ts
 * // 提前加载首屏大图，用户看到时已在缓存
 * await preloadResource("/hero.jpg");
 *
 * // 显式指定类型与跨域模式
 * await preloadResource("https://api.example.com/data", { as: "fetch", crossOrigin: "anonymous" });
 *
 * // 配合超时控制（见 async 模块）
 * await withTimeout(preloadResource("/font.woff2"), 3000).catch(() => {});
 * ```
 */
export function preloadResource(
  url: string,
  options?: PreloadResourceOptions,
): Promise<void> {
  // SSR / Node：无法预加载，静默跳过（与库整体 SSR 安全约定一致）
  if (typeof document === "undefined") return Promise.resolve();

  const as = options?.as ?? EXT_TO_AS[extractExt(url)];
  if (!as) {
    throw new RangeError(
      `preloadResource: 无法从 URL 推断资源类型，请显式传入 as（url: ${url}）`,
    );
  }

  const key = `${as}:${url}`;
  const cached = pending.get(key);
  if (cached) return cached;

  const task = new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = as;
    link.href = url;

    const crossOrigin =
      options?.crossOrigin ?? (as === "font" ? "anonymous" : undefined);
    if (crossOrigin) link.crossOrigin = crossOrigin;

    const done = (fn: () => void): void => {
      link.removeEventListener("load", onLoad);
      link.removeEventListener("error", onError);
      fn();
    };

    const onLoad = (): void => done(resolve);
    const onError = (): void => {
      // 失败不缓存，允许调用方重试
      pending.delete(key);
      link.remove();
      done(() => reject(new Error(`preloadResource: 资源预加载失败（${url}）`)));
    };

    link.addEventListener("load", onLoad, { once: true });
    link.addEventListener("error", onError, { once: true });
    document.head.appendChild(link);
  });

  pending.set(key, task);
  return task;
}

export interface PreloadedImage {
  /** 图片固有宽度（像素），SSR 下为 0 */
  width: number;
  /** 图片固有高度（像素），SSR 下为 0 */
  height: number;
}

/** 模块级去重缓存：同一 URL 复用进行中/已完成的加载 */
const pending = new Map<string, Promise<PreloadedImage>>();

/**
 * 预加载图片，成功时 resolve 其固有尺寸（可用于占位布局），失败时 reject。
 *
 * 基于 `new Image()`，相同 URL 的重复调用复用进行中的预加载（返回同一个 Promise），
 * 不会发起重复请求；此前加载失败的资源再次调用会重新发起。
 *
 * SSR / Node 下 resolve `{ width: 0, height: 0 }`（静默空操作，与库整体约定一致）。
 *
 * @param url - 图片地址
 *
 * @example
 * ```ts
 * // 轮播图切换前预加载，拿到尺寸先渲染占位
 * const { width, height } = await preloadImage(next.src);
 * setPlaceholder(width / height);
 * ```
 */
export function preloadImage(url: string): Promise<PreloadedImage> {
  if (typeof Image === "undefined") return Promise.resolve({ width: 0, height: 0 });

  const cached = pending.get(url);
  if (cached) return cached;

  const task = new Promise<PreloadedImage>((resolve, reject) => {
    const img = new Image();

    const done = (fn: () => void): void => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      fn();
    };

    const onLoad = (): void => {
      done(() => resolve({ width: img.naturalWidth, height: img.naturalHeight }));
    };
    const onError = (): void => {
      // 失败不缓存，允许调用方重试
      pending.delete(url);
      done(() => reject(new Error(`preloadImage: 图片加载失败（${url}）`)));
    };

    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
    img.src = url;
  });

  pending.set(url, task);
  return task;
}

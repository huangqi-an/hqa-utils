/**
 * 等待下一个动画帧（requestAnimationFrame 的 Promise 化）
 *
 * 无参调用返回帧时间戳；传入函数时在下一帧执行并以返回值 resolve。
 * 无 requestAnimationFrame 的环境（Node / SSR）降级为 setTimeout 16ms 模拟一帧。
 * @returns 无 fn 时 resolve 帧时间戳；有 fn 时 resolve 其返回值
 * @throws fn 同步抛出的错误会转化为 Promise 拒绝
 * @example
 * // 等 DOM 插入并完成一帧渲染后再测量
 * container.appendChild(el);
 * await raf();
 * const height = el.getBoundingClientRect().height;
 * @example
 * // 带回调，拿到帧时间戳做动画插值
 * const scale = await raf((time) => Math.min(1, (time - start) / 300));
 */
export function raf(): Promise<number>;
export function raf<T>(fn: (time: number) => T): Promise<T>;
export function raf<T>(fn?: (time: number) => T): Promise<T | number> {
  return new Promise<T | number>((resolve, reject) => {
    const callback = (time: number): void => {
      try {
        resolve(fn ? fn(time) : time);
      } catch (error) {
        reject(error);
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(callback);
    } else {
      setTimeout(() => callback(Date.now()), 16);
    }
  });
}

/**
 * 连续等待 n 个动画帧
 *
 * 常用于触发 CSS 过渡：插入 DOM → 等两帧 → 修改样式，确保过渡动画生效。
 * @param n 需要等待的帧数，必须为正整数
 * @returns resolve 最后一个帧的时间戳
 * @throws n 不是正整数时抛出 RangeError
 * @example
 * el.style.opacity = "0";
 * container.appendChild(el);
 * await waitFrames(2);
 * el.style.opacity = "1"; // 过渡动画正常触发
 */
export async function waitFrames(n: number): Promise<number> {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError("n must be a positive integer");
  }
  let last = await raf();
  for (let i = 1; i < n; i++) last = await raf();
  return last;
}

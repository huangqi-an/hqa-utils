// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForElement } from "./waitForElement.js";
import { TimeoutError } from "../async/withTimeout.js";

/** 等待微任务与 MutationObserver 回调执行完 */
function flushMutation(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("waitForElement（等待元素出现）", () => {
  afterEach(() => {
    // SSR 用例会把 document stub 掉，这里需要守卫
    if (typeof document !== "undefined") document.body.innerHTML = "";
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("元素已存在时立即 resolve", async () => {
    document.body.innerHTML = `<div class="target">here</div>`;
    const el = await waitForElement(".target");
    expect(el?.textContent).toBe("here");
  });

  it("元素后续挂载时通过 MutationObserver resolve", async () => {
    const promise = waitForElement(".late");
    expect(await Promise.race([promise, "pending"])).toBe("pending");

    const node = document.createElement("div");
    node.className = "late";
    document.body.appendChild(node);

    await flushMutation();
    await expect(promise).resolves.toBe(node);
  });

  it("嵌套深处挂载（subtree 监听）也能命中", async () => {
    const promise = waitForElement(".deep .inner");

    const wrapper = document.createElement("div");
    wrapper.className = "deep";
    document.body.appendChild(wrapper);
    await flushMutation();
    // wrapper 本身不匹配，promise 仍在等待
    expect(await Promise.race([promise, "pending"])).toBe("pending");

    const inner = document.createElement("span");
    inner.className = "inner";
    wrapper.appendChild(inner);
    await flushMutation();
    await expect(promise).resolves.toBe(inner);
  });

  it("root 自定义：只在该容器内查找", async () => {
    document.body.innerHTML = `<span class="outside"></span><div id="box"></div>`;
    const box = document.getElementById("box")!;
    const promise = waitForElement(".outside", { root: box });

    // body 直接挂载同名元素不影响
    const other = document.createElement("span");
    other.className = "outside";
    document.body.appendChild(other);
    await flushMutation();

    const inBox = document.createElement("span");
    inBox.className = "outside";
    box.appendChild(inBox);
    await flushMutation();
    await expect(promise).resolves.toBe(inBox);
  });

  it("timeout 超时以 TimeoutError reject", async () => {
    vi.useFakeTimers();
    try {
      const promise = waitForElement(".never", { timeout: 50 });
      const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
      await vi.advanceTimersByTimeAsync(50);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("非浏览器环境 resolve null", async () => {
    vi.stubGlobal("document", undefined);
    expect(await waitForElement(".x")).toBeNull();
  });
});

# security 安全小件

CSP（内容安全策略）配套工具：nonce 读取与违规监听。

| 导出 | 说明 |
| --- | --- |
| `getCspNonce()` | 读取当前页面的 CSP nonce（动态注入 script / style 用） |
| `onCspViolation(callback)` | 监听 CSP 违规事件（`securitypolicyviolation`） |

## getCspNonce()

读取当前页面的 CSP nonce，供运行时动态注入 script / style 使用——CSP 模式（`script-src 'nonce-xxx'`）下，动态创建的脚本和样式必须带同一个 nonce 才能通过浏览器校验。

```ts
import { getCspNonce } from "@huangqi_an/hqa-utils";

const nonce = getCspNonce();
const script = document.createElement("script");
if (nonce) script.setAttribute("nonce", nonce);
script.src = "/analytics.js";
document.head.appendChild(script);
```

- 探测顺序：`script[nonce]` / `style[nonce]` 元素 → meta CSP content 里 `script-src` 的 `'nonce-xxx'` → `null`
- 关键坑：CSP 页面上 `getAttribute("nonce")` 会被浏览器隐藏返回空（防选择器探测），必须走 IDL 属性 `.nonce`——本函数已处理
- SSR 返回 `null`

## onCspViolation(callback)

监听 CSP 违规事件（`securitypolicyviolation`）：页面加载被禁止的资源、执行被禁止的内联代码时触发。**meta 方式声明的 CSP 不支持 `report-uri`（浏览器忽略），事件监听是 meta 场景下唯一的违规上报通道**，与 `createReporter` 配合接入监控。

```ts
import { onCspViolation } from "@huangqi_an/hqa-utils";

const stop = onCspViolation((event) => {
  reporter.report("csp-violation", {
    directive: event.violatedDirective,
    blockedURL: event.blockedURL,
  });
});

stop(); // 组件卸载时取消
```

- 回调参数为原生 `SecurityPolicyViolationEvent`（含 `violatedDirective` / `blockedURL` / `sample` 等）
- SSR 返回 noop

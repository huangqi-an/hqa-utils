# random 随机 ID

随机唯一 ID 生成：短 ID 与 UUID v4 两种格式。

| 导出 | 说明 |
| --- | --- |
| `randomId(size?, alphabet?)` | 短 ID（21 字符 URL-safe，加密熵源，不限 secure context） |
| `uuid()` | UUID v4 格式（36 字符，全环境生成） |

## randomId(size?, alphabet?)

短 ID 生成。基于 `crypto.getRandomValues`——与 `crypto.randomUUID` 不同，**不要求 secure context**，HTTP 环境同样可用，Node 18+ SSR 亦内置。默认 21 字符、64 进制、约 126 bits 熵。

```ts
import { randomId } from "@huangqi_an/hqa-utils";

randomId();          // "tV0gGXR8_Z5jdHi6B-myT"
randomId(8);         // 短 ID："ND-k0Yk2"
randomId(6, "01");   // 二进制串："011010"
```

- 默认字母表为 base64url 标准 64 字符（RFC 4648 §5，6-bit 掩码完美无偏采样，已导出 `DEFAULT_ALPHABET`）；自定义字母表（2~256 字符）自动走掩码 + 拒绝采样，无 modulo bias
- 环境缺少 `crypto.getRandomValues` 时抛错，不静默降级 `Math.random`（避免可预测 ID 被误用于安全场景）

## uuid()

UUID v4 格式的唯一 ID（36 字符带连字符），三级降级且**每级格式恒定**：

1. secure context：原生 `crypto.randomUUID()`
2. HTTP 环境：`crypto.getRandomValues` 按 RFC 4122 手拼（设版本位与变体位），与原生同格式、同 122 bits 熵
3. 最终兜底：`Math.random` 模板——格式不变但熵弱且可预测，**不可用于安全场景**

```ts
import { uuid } from "@huangqi_an/hqa-utils";

// requestId、列表 key 等无安全要求场景
fetch("/api/data", { headers: { "X-Request-Id": uuid() } });

// ID 参与安全决策：跳过 Math.random 兜底，缺 crypto 时抛错
const sessionId = uuid({ secure: true });
```

- 需要标准 UUID 格式（如数据库主键约定）时用它；`secure context` 之外的 `crypto.randomUUID` 直接不可用，本函数补上缺口
- `{ secure: true }`：ID 参与安全决策（防伪造令牌、会话标识）时开启，环境缺 crypto 直接抛错而非产出可预测 ID

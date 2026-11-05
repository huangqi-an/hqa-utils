# random 随机 ID

加密熵源的随机唯一 ID 生成。

| 导出 | 说明 |
| --- | --- |
| `randomId(size?, alphabet?)` | 随机唯一 ID（默认 21 字符 URL-safe，可定制长度与字母表） |

## randomId(size?, alphabet?)

生成随机唯一 ID。基于 `crypto.getRandomValues`——与 `crypto.randomUUID` 不同，**不要求 secure context**，HTTP 环境同样可用，Node 18+ SSR 亦内置。默认 21 字符、64 进制、约 126 bits 熵（与 nanoid 同规格），签名也一致。

```ts
import { randomId } from "@huangqi_an/hqa-utils";

randomId();          // "V1StGXR8_Z5jdHi6B-myT"（21 字符）
randomId(8);         // 短 ID："ND-k0Yk2"
randomId(6, "01");   // 二进制串："011010"
```

- 默认字母表 64 个 URL-safe 字符（6-bit 掩码完美无偏采样）；自定义字母表（2~256 字符）自动走掩码 + 拒绝采样，无 modulo bias
- 随机性来自加密级熵源；注意**不是** UUID 格式，需要标准 UUID 时用 `crypto.randomUUID()`
- 环境缺少 `crypto.getRandomValues` 时抛错，不静默降级 `Math.random`（避免可预测 ID 被误用于安全场景）

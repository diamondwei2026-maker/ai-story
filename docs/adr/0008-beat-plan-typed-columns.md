# Beat 数据模型：从无类型 `plan` JSON 升级为强类型顶层列

Beat 实体当前将冲突点、钩子预设、读者期待值等叙事字段存储在自由格式的 `plan: Json` 列中。PRD #20 要求新增 5 个叙事字段（`narrativeSummary`、`pacingLabel`、`hookCausalChain`、`conflictIntensity`、`readerExpectation`）。我们决定将这些字段全部作为顶层列写入 Beat 模型，同时保留 `plan` 列供 V1 数据向下兼容。

## Decision — 强类型顶层列 + 惰性补全 + `plan` 保留

1. **新增 6 个顶层列**：
   - `narrativeSummary: String`（默认 `""`）——AI 生成的 100-150 字叙事摘要
   - `pacingLabel: String`（默认 `"中"`）——节奏标签：快/中/慢
   - `hookCausalChain: Json`（默认 `[]`）——钩子因果链数组，每个钩子含编号和回收章节引用
   - `conflictIntensity: Int`（默认 `3`）——冲突强度 1-5（1=日常过渡，5=生死决战）
   - `readerExpectation: Int`（默认 `3`）——读者期待值 1-5（1=平缓过渡，5=迫不及待）
   - `conflictDescription: String`（默认 `""`）——冲突完整段落描述（从 `plan.conflictPoint` 升级而来）
   所有列均为 required，默认值在 Schema 迁移时施加。
2. **不再向 `plan` 列写入新数据**。新 Beat 生成和 adjust 均仅填充顶层列。`plan` 列保留但不写入——现有 V1 数据原地不动，新 Beat 的 `plan` 为 `{}`。
3. **`toBeat()` 映射函数负责 V1→V2 降级推导**。若顶层列为默认值，则从 `plan.conflictPoint`、`plan.hookPresets` 等 V1 字段推导展示值（仅用于前端渲染，不写回数据库）。
4. **现有 `plan` 中的字段（`conflictPoint`、`hookPresets`）在 V2 中被重命名为完整语义名**：
   - `conflictPoint` → `conflictDescription: String`（从一句话扩展为完整描述）
   - `hookPresets: string[]` → `hookCausalChain: HookCausalLink[]`（从纯标签升级为编号钩子 + 回收章节引用）
5. **钩子因果链使用编号方案**（非纯文本匹配）。每个钩子分配唯一编号（`钩子1`、`钩子2`），`resolvesInChapter` 引用章节编号。`detectImpact()` 通过结构化集合差分检测跨章钩子断裂，无需 AI 调用。

## Considered Options

- **全塞进 `plan`**：零迁移量，但 `plan` 继续作为无类型 Blob，前端需从 `Record<string, unknown>` 中拆包，查询不可用。否决——PRD 已锁定确切结构，Blob 不再需要。
- **全部提升为列 + 删除 `plan`**：需要迁移脚本将 V1 数据一次性补全到新列。风险：批量改写旧数据可能出错，且 V1 数据质量参差不齐（非所有 V1 Beat 均有完整冲突描述）。否决——保留 V1 数据原样更安全。
- **混合：部分列 + 部分 `plan`**：产生多个权威来源，未来维护者必须记住哪个字段在哪个位置。否决。

## Consequences

- Beat 模型从 13 列扩展至 19 列。MongoDB 无列数限制——此为纯代码可读性问题。
- Prisma 迁移默认值确保旧数据即时可读（零运行时异常），无需数据修复脚本。
- `plan` 列预计在一个大版本后（所有 V1 数据自然过期或重构完成时）删除。届时 `toBeat()` 中的 V1 降级逻辑一并移除。
- ADR-0007 Decision 3 中定义的 `useR1` / `hookCount` / `isClimax` 字段不受本次变更影响——它们仍保留在 Beat 顶层，`shouldUseR1()` 计算逻辑不变。

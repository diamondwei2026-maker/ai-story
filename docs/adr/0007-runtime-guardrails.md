# 运行时护栏：上下文预算、FactSheet 补偿、关键章节识别与模型容错

修复 PRD 自检中发现的上下文注入超预算无裁剪策略、FactSheet 乐观锁失败无补偿、关键章节识别标准模糊、模型降级死循环等 4 个问题。

**Context**：自检发现（1）生成上下文三层注入总预算 5-8K tokens 但无一层定义硬上限，前一章超长时必然溢出；（2）FactSheet 乐观锁失败后"跳过"与 ADR-0002 的事实簿一致性目标矛盾；（3）"关键章节"在 ADR-0003 中用钩子密度识别、在 PRD 中用结构位置（开篇/高潮/结局），两处定义不一致且钩子密度无阈值；（4）V3→R1→V3 的双向降级在两者同时不可用时形成逻辑死循环。

## Decision 1 — 上下文注入三层硬上限与裁剪策略

每层定义硬上限，总预算上限 8K tokens。超限时按优先级裁剪：

```
总预算：≤ 8000 tokens（约 6000 中文字符等价）

第一层 — 全局静态（上限 3000 tokens，来自 SETTING Phase）：
  优先级 1: 核心角色卡摘要（主角 + 反派 + 关键配角，每人 ≤ 400 tokens）
  优先级 2: 世界观核心摘要（≤ 800 tokens）
  优先级 3: 力量/战斗体系约束（≤ 400 tokens）
  优先级 4: 完整角色关系图（≤ 600 tokens）
  优先级 5: 完整世界观描述（≤ 800 tokens，优先级 1-4 满足后剩余空间填充）
  
  裁剪规则：按优先级从低到高移除，直到 ≤ 3000 tokens

第二层 — 全局动态（上限 2000 tokens，来自 FactSheet 检索）：
  按关键词匹配度降序排列，取前 N 条直至累计 token 数 ≤ 2000
  单条条目上限 300 tokens（超长条目由 AI 在 BEATS 确认后初始化时压缩）

第三层 — 局部上下文（上限 3000 tokens，来自 BEATS + 前一章）：
  优先级 1: 当前 Beat（完整注入，上限 500 tokens）
  优先级 2: 前一章正文
    - 正文 ≤ 2500 tokens → 完整注入
    - 正文 > 2500 tokens → AI 生成摘要（≤ 400 tokens）替代全文
    - 摘要由 Chapter 生成管道的步骤 5 在审核通过后自动生成并存入 Chapter.contextSummary
  第 1 章特殊处理：IDEA Phase 的一句话简介 + 500 字简介替代"前一章"，总上限 800 tokens
```

**Token 计数**：使用 DeepSeek tokenizer（通过 OpenRouter API 的 token counting 端点），在注入前做预计算。若三层各自裁剪后总和仍超 8K → 从第三层（局部上下文）开始进一步压缩，再到第二层（全局动态），第一层（全局静态）最后。

**理由**：
- 每层独立上限防止某一层消耗全部预算。三层预算分配基于"全局静态变化最小可缓存、局部上下文每章不同"的特性
- 长章摘要而非截断——截断可能在句中切断，破坏叙事连贯性。AI 摘要保留关键情节节点
- 第 1 章不注入前一章全文（不存在），用 IDEA 简介替代

## Decision 2 — FactSheet 乐观锁失败补偿队列

乐观锁（version 字段）写冲突的处理从"跳过"改为"入队 + 合并"：

```
更新 FactSheet 时 version 冲突:
  1. 自动重读最新 FactSheet
  2. 重新 AI 合并新旧条目（一次调用完成）
  3. 再次 findOneAndUpdate({ version: expectedVersion }, { version: expectedVersion + 1 })
  4. 仍冲突 → 将本次更新条目写入 Project.pendingFactUpdates 队列
     → 管道继续不中断
  5. 下次成功更新 FactSheet 时（任意 Chapter 触发）:
     → 从 pendingFactUpdates 取出所有待处理条目
     → 合并到本次 AI 更新中（去重 + 冲突裁决）
     → 清空队列
```

- `pendingFactUpdates` 存储在 Project 文档中，格式：

```typescript
{
  pendingFactUpdates: Array<{
    chapterId: ObjectId;
    chapterNumber: number;
    entries: FactEntry[];       // 待合并的条目
    queuedAt: Date;
  }>;
}
```

- 队列深度监控：
  - `pendingFactUpdates.length` ≥ 5 → 下一条 AI 调用时在 Prompt 中增加优先级标记
  - `pendingFactUpdates.length` ≥ 10 → UI 展示告警横幅："事实簿更新延迟，建议暂停生成新章并手动触发同步"
- 手动触发同步：Project 设置页提供"强制同步事实簿"按钮 → 立即消费队列
- 消费队列的 AI 调用不计入用户 Token 预算告警（属于系统恢复操作，非创作消耗）

**理由**："跳过"是临时方案但不应成为最终策略。补偿队列将跳过从"数据丢失"降级为"延迟消费"——事实最终会同步到 FactSheet，只是有时间窗口。队列深度监控防止无限累积。

## Decision 3 — 关键章节双重判定标准

取消 PRD 和 ADR-0003 之间的模糊定义，统一为双重判定——**满足任一条件即使用 R1**：

| 判定维度 | 条件 | 判定方式 |
|---------|------|---------|
| 结构位置 | 开篇（第 1-3 章）或结局（最后 3 章） | 自动判定（BEATS 确认时计算） |
| 钩子密度 | Beat.hookCount ≥ 3 | 自动判定（BEATS 生成时 AI 提取） |
| 高潮标记 | Beat.isClimax = true | 用户手动标记（BEATS Phase 中每条 Beat 提供一个勾选框） |

- 开篇/结局的章节编号在 BEATS 确认时根据总 Beat 数动态计算（最后 3 章 = 总数 N 中的 N-2, N-1, N）
- Beat 数据模型新增字段：

```typescript
// Beat 文档
{
  hookCount: number;       // AI 识别本章钩子数量（悬念点 + 冲突节点合计），BEATS 生成时填充
  isClimax: boolean;       // 用户手动标记，默认 false
  useR1: boolean;          // 计算结果：结构位置 || hookCount ≥ 3 || isClimax → true
}
```

- `useR1` 在 BEATS 确认时批量计算并固化到 Beat 文档中
- 用户在 BEATS Phase 可修改 `isClimax`（开篇/结局的自动判定不可修改，但用户可额外标记中间章节为高潮）
- `isClimax` 是领域属性标记（用户对叙事重要性的标注），非模型选择的直接覆盖开关。它与其他两个判定维度平等地参与 `useR1` 的布尔计算，不赋予用户直接指定模型的能力
- DRAFTING 阶段生成 Chapter 时读取 Beat.useR1 决定模型

**理由**：
- 双重判定覆盖了"作者意图"（isClimax）和"系统检测"（hookCount）两方面的关键性
- 结构位置保底——无论钩子密度如何，开篇和结局的质量不容妥协
- 钩子密度阈值 3：小于 3 的章节通常只有"开场钩子+结尾钩子"，≥3 意味着章节内部还有至少一个中层悬念或冲突转折，叙事重要性明显更高

## Decision 4 — 模型降级策略修正为单向降级 + 最终用户阻塞

降级链从双向循环改为单向链，终端为用户阻塞：

```
调用 DeepSeek-V3 的任务:
  失败 → 自动降级到 DeepSeek-R1
  R1 也失败 → 根据 TaskType 决定:
    - 正文生成/改写/润色: 暂停，通知用户"AI 服务暂时不可用，请稍后重试"
    - 合规审核: 暂停，Chapter 保持在 REVIEWING 状态，不自动通过
    - 指纹/FactSheet 提取: 跳过本次更新，记录到 pendingFactUpdates

调用 DeepSeek-R1 的任务:
  失败 → 自动降级到 DeepSeek-V3
  V3 也失败 → 同上处理
```

- 不循环降级：V3→R1→阻塞，R1→V3→阻塞。终点始终是用户可见的暂停
- 降级事件记录日志（包含 taskType、原模型、降级模型、失败原因、时间戳）
- 前端在 AI 调用区域展示当前使用的模型名称（如"DeepSeek-V3"），降级时展示黄色 Badge "已降级至 R1"
- 两个模型同时不可用时：弹 Modal 告知用户，提供"手动重试"按钮，不自动轮询

**理由**：双向循环降级 V3→R1→V3 在单点故障时适用，但两者同时不可用时形成死循环。单向链 + 终端阻塞更安全——与其静默重试浪费 token，不如让用户知情后决定。

---

## Consequences

- 上下文注入需要 Token 预计算模块（调用 DeepSeek tokenizer），增加一次轻量 API 调用
- 每章审核通过后需额外 AI 调用来生成长章摘要（存入 Chapter.contextSummary），约增加 200 tokens 消耗
- FactSheet 更新逻辑需重构：从单次 findOneAndUpdate 扩展为"乐观锁→入队→下次批量消费"三步
- Project schema 新增 `pendingFactUpdates` 字段
- Beat schema 新增 `hookCount`, `isClimax`, `useR1` 三个字段
- BEATS 生成 Prompt 需增加钩子计数输出（结构化 JSON 字段）
- AIGatewayModule 的降级逻辑需重构为单向链
- 前端新增"模型状态指示器"组件和"AI 不可用"错误 Modal
- **跨 Phase 回退后的 FactSheet 处理**：当跨 Phase 回退导致章节数变更（如大纲从 30 章变为 40 章）时，旧章节的 ChapterFingerprint 随文档标记 STALE 后不再参与 ChangeAnalysis 匹配；旧 FactSheet 条目保留——它们代表历史有效状态。新章节生成后，FactSheet 增量更新自然覆盖或合并旧条目，不执行批量清理以防误删跨结构仍然有效的事实

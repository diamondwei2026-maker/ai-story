# BEATS 细纲拆解阶段交互重构

**Issue**: [#20](https://github.com/diamondwei2026-maker/ai-story/issues/20)
**状态**: ready-for-agent
**创建日期**: 2026-06-03
**最后更新**: 2026-06-05（grill-with-docs 决策沉淀，ADR-0008）

---

## Problem Statement

BEATS 细纲拆解阶段的当前实现存在三个核心问题：

**1. 用户无法控制小说篇幅。** AI 硬编码在 20-30 章范围内自行决定章节数，用户没有表达创作意图的入口。`Project.config.defaultChapterWordCount` 存在于数据模型中但未注入 BEATS 生成管道——两个关键的篇幅控制参数（总章数、每章字数）完全由 AI 自由裁量。

**2. 调整界面暴露技术字段，对小白用户不友好。** 当前 BeatEditor 直接展示 `conflictPoint`（冲突点）、`hookPresets`（钩子预设）、`hookCount`（钩子密度）、`useR1`（R1 蓝色标签）等技术字段——这些对不会写小说的用户毫无意义。同时，BeatEditor 组件已实现但未被 BeatsView 挂载，编辑入口完全缺失。

**3. 缺乏分层信息架构，无法同时服务小白和资深作者。** 小白只需要读叙事摘要并回答"这章好不好"，资深作者需要精确控制冲突结构、钩子布局、字数分配。当前界面把所有人当成了同一种用户。

## Solution

### 核心思路

将 BEATS 阶段从"技术参数编辑面板"重构为"故事导航地图"——以叙事摘要为默认视图，通过三层递进式信息密度，同时服务小白和资深作者。

布局从双栏（列表+详情）改为单列叙事流：顶部紧凑统计条 + 可选展开的节奏诊断图 + 章节叙事卡片流。用户像翻阅故事地图一样逐章审视，有疑问的章节就地展开编辑，满意的章节继续下滑。

### 三层信息架构

**第一层：叙事摘要卡片（默认视图，所有人必看）**

每章展示为一张叙事卡片（`BeatNarrativeCard`）：AI 生成的场景摘要描述（约 100-150 字）、字数、节奏标签（快/中/慢）。操作入口为"换一种写法"下拉菜单（预定义选项 + 自定义文本输入框），不暴露任何技术字段。点击卡片标题栏或"展开详情"按钮进入第二层。

指标说明：
- **字数**：直接显示"3000字"——网文读者对该单位已有直觉，"阅读时间"换算（250字/分钟）不提供额外信息，删除。
- **节奏标签**：AI 生成字段（快/中/慢），与冲突强度匹配，展示于卡片底部。

**第二层：结构化参数面板（点击展开，给需要的人）**

展开后展示核心冲突的完整段落描述（`conflictDescription`，叙事化表达，非"冲突点"技术字段名）、钩子因果链（带编号的钩子 + 箭头指向回收章节）、本章在全书高潮位置图中的标记。可编辑冲突描述文本、增减钩子、调整字数、切换高潮标记。isClimax 勾选框始终可见。手风琴模式——一次仅展开一张卡片。

**第三层：全书节奏诊断（全局视图，默认折叠）**

两条折线图替代现有的钩子密度柱状图：冲突强度曲线（1-5）+ 读者期待值走势（1-5）。系统标注低质量区间并给出自然语言警告（如"第8-12章期待值持续偏低，可能导致读者中途弃书"）。提供"一键优化该区间"操作——通过 `POST /beats/batch-adjust` 端点批量调整整段 Beat。

### 篇幅控制（方案 B 落地，grill Q1/Q4/Q23）

进入 BEATS 后，用户首先看到参数配置面板，而非直接自动生成：
- **篇幅预设**：a-segmented 三档自然语言选项——短篇（~15章）/ 中篇（~25章）/ 长篇（~40章）。系统根据大纲段数给出建议值（前端解析大纲文本中"第X幕"数量 × 3）。AI 接收具体数字（如 25），允许 ±10% 浮动。
- **默认每章字数**：a-segmented 四档选择（2000 / 3000 / 4000 / 5000），默认读取 `Project.config.defaultChapterWordCount`。
- **大纲预览**：a-collapse 折叠区显示大纲结构化摘要（每幕一行标题），帮助用户确认拆解基础。
- **两个参数** `targetChapterCount`（number）和 `defaultWordCount`（number）注入 `generateBeats` Prompt，替代当前硬编码的"20-30章"和"默认3000字"。
- 参数传递链路：Config Panel a-segmented → `beats.ts` API → `step.service.generateBeats()` → `beats-generation.md` `{{targetChapterCount}}` / `{{defaultWordCount}}`。

### 调整操作的自然语言化（grill Q2/Q3/Q8/Q9）

逐章调整不再要求用户直接修改技术字段。用户通过感受级指令表达意图：
- **预定义选项**（快捷填充到文本输入框）：节奏快一点 / 节奏慢一点 / 冲突更激烈 / 多一些悬念 / 直接重写
- **自定义**：展开自由文本输入框（如"让反派在这一章提前出场"）
- 反馈文本直接透传给 AI（不做前端翻译），`beats-adjust.md` prompt 模板负责理解和执行

**单章调整（`POST /beats/:beatId/adjust`）**：
1. 接收原始 Beat 数据 + 用户反馈 + 相邻章节叙事锚点（前一章收束点 + 后一章起点）
2. AI 基于最小区间上下文重新生成该 Beat（保持核心剧情走向不变，除非用户明确要求）
3. 返回更新后的 Beat + 影响分析（`affectedChapterNumbers` + `warnings`）
4. 影响分析由**前端纯结构化计算**——比较调整前后 `hookCausalChain` 的集合差分，检测哪些章节引用了被删除/变更的钩子。零 AI 调用，结果非持久化（页面刷新消失）
5. 受影响章节在 UI 中标黄提示，不自动标记 STALE——用户逐章审视、自行决定是否需要调整

### 技术字段隐藏（grill Q7/Q21/Q25）

以下字段从前端 UI 完全移除：
- `useR1` 标签——模型选择是技术实现细节，不是用户决策依据。`shouldUseR1()` 计算逻辑保留不变（ADR-0007 Decision 3）
- `hookCount` 数字——仅作为 `shouldUseR1()` 判定输入和第三层折线图数据源，不直接暴露给用户
- `conflictPoint` / `hookPresets` 字段名——改用叙事化表达：
  - `conflictPoint: string` → `conflictDescription: string`（从一句话升级为完整段落描述）
  - `hookPresets: string[]` → `hookCausalChain: HookCausalLink[]`（从纯标签升级为编号钩子 + 回收章节引用）

## User Stories

### 篇幅控制
1. As a 不会写小说的新手, I want 在开始拆解前选择"我想写一个长篇故事", so that 系统自动确定合适的章节数而不是让我面对一个数字滑块
2. As a 资深网文作者, I want 看到系统基于大纲段数建议的章节数范围, so that 我可以判断AI的建议是否合理并做出最终决定
3. As any user, I want 在驳回重新生成时看到我的篇幅选择被保留, so that 不需要每次重新输入
4. As a 连载作者, I want 设定每章默认3000字, so that 细纲拆解的密度匹配我的日更节奏

### 叙事摘要审查（第一层）
5. As a 不会写小说的新手, I want 每章展示一段"这章讲了什么"的剧情摘要, so that 我不用理解冲突点、钩子这些概念就能判断这章好不好
6. As a 资深作者, I want 在叙事摘要旁边看到节奏标签和字数, so that 快速扫描就能识别需要关注的章节
7. ~~As any user, I want 看到"预计阅读12分钟"而不是"3000字"~~ → **已删除**（grill Q18：阅读时间是字数的线性换算，不提供额外信息。网文读者对字数已有直觉，直接显示"3000字"更清晰）
8. As a 新手, I want 点击"换一种写法"后看到一组预设选项, so that 我不需要自己描述该怎么调整
9. As a 资深作者, I want 在预设选项之外还有自由输入框, so that 我可以写"让反派在这一章提前出场"这样的具体指令
10. As any user, I want 调整某章后立即看到新的叙事摘要, so that 判断新版本是否满意

### 结构化编辑（第二层）
11. As a 资深作者, I want 展开某章后看到冲突描述的完整段落, so that 判断冲突的锋利度和合理性
12. As a 资深作者, I want 看到每个钩子的因果描述（"'钩子1: 反派身份' → 将在第12章回收"）, so that 检查钩子布局是否有遗漏
13. As a 资深作者, I want 在展开面板中直接编辑冲突文本和钩子列表, so that 精确控制叙事结构
14. As a 资深作者, I want 标记/取消某章为高潮章节, so that 控制全书的高潮弧线位置
15. As a 新手, I want 如果误触展开第二层也不会被吓到, so that 看到的仍是可读的段落而非技术字段名

### 全局节奏诊断（第三层）
16. As a 资深作者, I want 看到全书的冲突强度(1-5)和期待值(1-5)走势折线图, so that 判断整体节奏是否合理
17. As a 新手, I want 看到系统的自然语言警告（如"中间部分可能太水"）, so that 不需要看懂图表也能发现问题
18. As any user, I want 点击"一键优化第8-12章"后系统批量自动调整, so that 解决节奏问题不需要逐章手动修改

### 确认与驳回
19. As any user, I want 浏览完所有章节后点击一个确认按钮就进入正文, so that 不需要逐章打勾确认
20. As any user, I want 不评价的章节默认为"认可", so that 减少不必要的点击操作
21. As a 犹豫型用户, I want 在配置面板修改参数后点击"开始拆解"重新生成全部 Beat, so that 当前版本完全不满意时可以快速重来（grill Q15："全部重写"按钮与"开始拆解"合并为一个入口）

### 已确认后的轻量修改
22. As a DRAFTING阶段的作者, I want 回到BEATS页面修改某章字数时不影响其他已生成章节, so that 微调不会造成大面积返工
23. As a DRAFTING阶段的作者, I want 修改某章结构时收到"对应章节将标记为待更新"的警告, so that 我知道改动的下游影响

## Implementation Decisions

### 新建组件
| 组件 | 职责 | Grill 决策 |
|------|------|-----------|
| **BeatsConfigPanel** | 参数配置面板。篇幅预设 a-segmented（短篇/中篇/长篇）+ 默认字数 a-segmented（2000/3000/4000/5000）+ 大纲预览折叠区 a-collapse（结构化摘要，每幕一行）。初始态展示。REVIEWING 态可收缩为一行提示。 | Q4, Q23 |
| **BeatNarrativeCard** | 单章叙事卡片（替代旧 `BeatChapterCard`）。折叠态：叙事摘要 + 字数 + 节奏标签 + "换一种写法"下拉菜单。展开态（手风琴模式，单卡展开）：冲突描述段落 + 钩子因果链列表 + isClimax 勾选框 + 目标字数编辑。内嵌旧 BeatEditor 的编辑逻辑（不再独立组件）。 | Q5, Q16, Q17 |
| **BeatsRhythmChart** | 全书节奏走势图。冲突强度(1-5)折线 + 读者期待值(1-5)折线 + 低质量区间标注 + 自然语言警告 + "一键优化该区间"按钮。数据源为 Beat 顶层字段 `conflictIntensity` 和 `readerExpectation`（非旧 `hookCount`）。替代 HookDensityChart 的用户可见角色。 | Q6, Q12 |
| **BeatsStatsBar** | 紧凑单行统计条（替代旧 `BeatsSummaryCard` 的卡片形态）。显示：总章数 · 总字数 · 高潮章数 · 主导节奏标签。不暴露 R1 统计或 hookCount。 | Q16, Q22 |

### 改造组件
| 组件 | 改造内容 |
|------|---------|
| **BeatsView** | 完整布局重构。单列叙事流：ConfigPanel（可收缩）→ StatsBar → RhythmChart（折叠）→ BeatNarrativeCard 列表 → 确认按钮。移除自动生成守卫（`watch initialLoadDone → handleGenerate`）。移除 HookDensityChart DOM 挂载。引入 `useBeatsAdjustment` composable。完整状态机：CONFIG → GENERATING → REVIEWING → CONFIRMED（CONFIRMED 态仅轻量编辑，无确认/驳回按钮）。 |
| **BeatList** | **删除。** 卡片列表由 BeatsView 内 `v-for BeatNarrativeCard` 直接渲染，不需要独立的列表组件。 |
| **BeatEditor** | **删除独立组件。** 编辑逻辑（字数修改、结构修改、isClimax 切换）内嵌入 `BeatNarrativeCard` 的展开态。字段标签改用自然语言（"冲突描述"而非"冲突点"、"钩子因果链"而非"钩子预设"）。`useR1` badge 移除。 |

### 新建 composable
| Composable | 职责 | Grill 决策 |
|-----------|------|-----------|
| **useBeatsAdjustment** | 封装三种调整操作状态管理：单章 adjust（`POST /beats/:beatId/adjust`）、字数修改（`PATCH /beats/:beatId/wordcount`）、结构修改（`PATCH /beats/:beatId/structure`）。统一 loading/error/success 状态。集成影响检测逻辑（纯前端结构化集合差分——比较 `hookCausalChain` 新旧差异，输出 `affectedChapterNumbers` + `warnings`，非持久化）。 | Q3, Q14 |

### 后端改动（grill Q1/Q2/Q8/Q12/Q13/Q20）
- `generateBeats()` 新增参数 `targetChapterCount: number`。与 `defaultWordCount` 一起注入 Prompt 模板。可选——不传时回退到旧版 AI 自决行为（20-30章）。
- 新增 `POST /projects/:pid/steps/beats/:beatId/adjust` 端点。接收自然语言反馈 + 相邻章节叙事锚点 → AI 重新生成该 Beat → 返回 `{ beat, impact }`。
- 新增 `POST /projects/:pid/steps/beats/batch-adjust` 端点。接收章节区间 + 问题描述 + 边界锚点 → AI 批量优化整段 Beat → 返回 `{ beats, impact }`。
- `parseBeatsFromOutput()` 扩展：从 AI 输出中解析 5 个新字段（`narrativeSummary`、`pacingLabel`、`hookCausalChain`、`conflictIntensity`、`readerExpectation`）。
- `toBeat()` 映射函数新增 V1→V2 降级逻辑：若顶层列为默认值，从 `plan.conflictPoint` / `plan.hookPresets` 推导展示值（仅前端渲染，不写回 DB）。
- 现有轻量修改端点（`PATCH /beats/:beatId/wordcount`、`PATCH /beats/:beatId/structure`）保留不变。

### Schema 变更（详见 ADR-0008，grill Q7/Q10/Q21/Q25）

Beat 模型新增 5 个**顶层列**（非塞入 `plan` JSON），`plan` 列保留供 V1 数据向下兼容：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `narrativeSummary` | `String` | `""` | AI 生成 100-150字叙事摘要 |
| `pacingLabel` | `String` | `"中"` | 节奏标签：快/中/慢 |
| `hookCausalChain` | `Json` (数组) | `[]` | 钩子因果链：`[{ hook, resolvesInChapter }]`，每个钩子分配编号（"钩子1"、"钩子2"） |
| `conflictIntensity` | `Int` | `3` | 冲突强度 1-5（1=日常过渡，3=中等对抗，5=生死决战） |
| `readerExpectation` | `Int` | `3` | 读者期待值 1-5（1=平缓过渡，3=好奇驱使，5=迫不及待） |

**V1 字段重命名**：
- `plan.conflictPoint: string` → 顶层 `conflictDescription: string`（从一句话升级为完整段落描述）
- `plan.hookPresets: string[]` → 顶层 `hookCausalChain: HookCausalLink[]`（从纯标签升级为编号钩子 + 回收章节引用）
- `plan.readerExpectation: string` → 顶层 `readerExpectation: int`（从"高/中/低"文本升级为 1-5 数值）

**Prisma 迁移**：惰性补全——新增 5 列均设默认值，旧数据无需迁移脚本。`plan` 列不再写入新数据（新生成的 Beat 中 `plan` 为 `{}`）。`toBeat()` 负责 V1→V2 降级推导。

### Prompt 变更

| Prompt 文件 | 变更 | Grill 决策 |
|------------|------|-----------|
| `beats-generation.md` | 新增 `{{targetChapterCount}}` 变量（替代硬编码"20-30章"）。输出格式新增 5 个字段：叙事摘要、冲突描述+强度(1-5)、读者期待值(1-5)、节奏标签、钩子因果链（编号 + 回收章节）。拆解要求更新冲突强度和期待值分布指导。 | Q19 |
| `beats-adjust.md`（新建） | 轻量单章调整 prompt。接收：当前章节数据 + 用户反馈 + 前一章收束点 + 后一章起点（最小区间上下文）。不传全书大纲。输出：完整 Beat 数据块（格式与 beats-generation.md 统一）。 | Q8, Q13 |
| `beats-batch-adjust.md`（新建） | 区间批量优化 prompt。接收：整段 Beat 数据 + 边界锚点 + 问题描述。AI 跨章协调调整冲突强度和期待值分布。输出：每章完整数据块（复用 `parseBeatsFromOutput` 解析）。 | Q12, Q20 |

### 关键交互决策
- **初始态**：展示配置面板，不自动生成。用户确认参数后手动点击"开始拆解"——替代旧版 `watch initialLoadDone → handleGenerate()` 自动触发逻辑
- **手风琴展开**：一次仅展开一张叙事卡片。单线程审阅流符合"翻阅故事地图"隐喻
- **不评价 = 默认认可**：用户无需逐章打勾，一键确认进入正文即可
- **篇幅预设用自然语言而非数字**：短篇/中篇/长篇映射到 ~15/~25/~40 章。AI 接收具体数字，允许 ±10% 浮动
- **R1 标签从 UI 完全移除**：BeatNarrativeCard、BeatsStatsBar 均不展示。后端 `useR1` 计算逻辑不变
- **HookDensityChart 替换为 BeatsRhythmChart**：旧组件代码保留但不再挂载到用户可见页面，数据逻辑作为 BeatsRhythmChart 数据源
- **"全部重写"按钮删除**：其功能与 Config Panel "开始拆解"完全重叠。用户改参数后点"开始拆解"即可重新生成。底部仅保留"确认细纲，进入正文"操作
- **"换一种写法"预定义选项**：快捷填充到文本输入框（非隐藏 AI 指令映射）——选中"节奏快一点"→ 文本框中填入"节奏快一点"→ 用户可编辑 → 提交。所有选项走同一 adjust 调用路径
- **CONFIRMED 态轻量修改**：字数修改 → Beat STALE + Chapter `targetWordCount` 同步更新；结构修改 → 操作前弹确认框警告 → Beat STALE + Chapter `beatPlan` 同步更新。不触发跨 Phase 回退

### 组件复用
| 元素 | 复用来源 |
|------|---------|
| a-segmented（篇幅预设 + 字数选择） | OutlineView 结构选择器 |
| a-collapse（大纲预览） | Ant Design Vue 原生 |
| a-card（叙事卡） | SettingView 卡模式 |
| a-spin / a-alert / EmptyState | 所有 Phase 视图通用 |
| .xxx-view__actions CSS | OutlineView/SettingView 布局 |
| a-input-number / a-checkbox | 旧 BeatEditor 用法保留，内嵌入 BeatNarrativeCard |
| 34 个 CSS 自定义属性 | 全局复用，无新增 |

### 组件文件变更汇总
| 操作 | 文件 |
|------|------|
| **新建** | `useBeatsAdjustment.ts`（composable） |
| **新建** | `beats-adjust.md`（prompt 模板） |
| **新建** | `beats-batch-adjust.md`（prompt 模板） |
| **重写** | `BeatChapterCard.vue` → `BeatNarrativeCard.vue`（叙事摘要 + 手风琴展开 + 内嵌编辑） |
| **重写** | `BeatsSummaryCard.vue` → `BeatsStatsBar.vue`（紧凑单行统计条） |
| **重写** | `BeatsConfigPanel.vue`（a-segmented 双选 + a-collapse 大纲预览） |
| **重写** | `BeatsRhythmChart.vue`（冲突强度 + 期待值双折线 + 警告 + 一键优化） |
| **重写** | `BeatsView.vue`（单列叙事流 + 状态机 + 移除自动生成守卫） |
| **改造** | `beats-generation.md`（`{{targetChapterCount}}` + 5 个新输出字段） |
| **改造** | `step.service.ts`（`generateBeats` + `targetChapterCount`、`adjustBeat`、`batchAdjustBeat`、`parseBeatsFromOutput` 扩展、`toBeat` V1 降级） |
| **改造** | `beats.controller.ts`（新增 `/adjust`、`/batch-adjust` 端点） |
| **改造** | `beat.types.ts`（5 个新顶层字段 + `conflictDescription` + `hookCausalChain` 类型） |
| **改造** | `prisma/schema.prisma`（Beat 模型新增 5 列） |
| **改造** | `beats.ts`（前端 API：新增 `targetChapterCount`、`adjustBeat`、`batchAdjustBeats`） |
| **改造** | `useBeatStore.ts`（新字段类型） |
| **改造** | `BeatsView.spec.ts`（约 70% 测试需重写以匹配新行为） |
| **删除** | `BeatList.vue`（卡片列表由 BeatsView 内 v-for 直接渲染） |
| **删除** | `BeatEditor.vue`（编辑逻辑内嵌入 BeatNarrativeCard） |
| **保留** | `HookDensityChart.vue`（代码保留为数据源，脱离 BeatsView DOM） |

## Testing Decisions

### 测试原则
只测试外部行为，不测试实现细节。

### 后端测试
- `generateBeats()` 新增 `targetChapterCount` 参数边界行为
- `adjustBeat()` 新端点的自然语言反馈处理 + 相邻章节锚点传递
- `batchAdjustBeats()` 新端点的区间批量优化
- `parseBeatsFromOutput()` 新增 5 个字段的解析正确性
- `toBeat()` V1→V2 降级推导逻辑

### 前端测试
- `BeatsConfigPanel` — 篇幅选择切换、字数选择切换、大纲预览展开、生成触发
- `BeatNarrativeCard` — 叙事摘要渲染、字数+节奏标签、换一种写法下拉交互、手风琴展开/收起、展开态冲突描述+钩子链渲染
- `BeatsRhythmChart` — 双折线数据绑定、低质量区间标注、自然语言警告渲染、一键优化触发
- `BeatsStatsBar` — 章数·字数·高潮·节奏四项统计渲染
- `BeatsView` — 完整状态流转（CONFIG → GENERATING → REVIEWING → CONFIRMED → CONFIRMED 轻量编辑）
- `useBeatsAdjustment` — 三种调整模式状态管理 + 影响检测逻辑

### 已有测试参考
- `BeatsView.spec.ts`（10 tests）需重写约 70%（7/10）——自动生成守卫移除、HookDensityChart 移除、新布局和状态机
- `BeatEditor.spec.ts` 需重写——组件删除，测试逻辑迁移至 BeatNarrativeCard
- `beats.controller.spec.ts`（11 tests）需新增 adjust + batch-adjust 端点测试

## Out of Scope

- DRAFTING 阶段的 Chapter 正文生成
- 模型降级逻辑（AIGatewayService 职责）
- FactSheet 初始化和增量更新
- 跨 Phase 回退后的 BEATS 重新拆解
- 大纲叙事结构切换（OUTLINE Phase 范围）
- 移动端适配
- 章节序号拖拽重排

## Further Notes

### 与 grill-with-docs 决策的交叉引用

本文已融入 2026-06-05 grill-with-docs 全部 25 项决策。以下决策有独立的 ADR 或 CONTEXT.md 记录：

- **ADR-0008**：Beat 数据模型 V2——强类型顶层列 + `plan` 保留 + V1→V2 惰性降级（覆盖 Q7、Q10、Q21、Q25）
- **CONTEXT.md**：新增 10 个领域术语（narrativeSummary、pacingLabel、hookCausalChain、conflictIntensity、readerExpectation、targetChapterCount、Beat Adjust、Batch Adjust、Impact Detection），Beat 定义重写

### HookDensityChart 迁移路径
组件代码保留但不再挂载到用户可见页面。数据逻辑作为 BeatsRhythmChart 数据源——`hookCausalChain.length` 和 `conflictIntensity` 替代旧 `hookCount` 和 `plan` 派生数据。

### BeatEditor 兼容性
双模式编辑降级为第二层内联内容（BeatNarrativeCard 展开态）。现有轻量修改 API（`PATCH /beats/:beatId/wordcount`、`PATCH /beats/:beatId/structure`）无 breaking change。

### ADR 兼容性
- ADR-0003：分层审核策略不变
- ADR-0007 Decision 3：`useR1` 计算逻辑不变（结构位置 + `hookCount ≥ 3` + `isClimax`），仅 UI 移除标签。`hookCount` 仍作为 `hookCausalChain.length` 缓存值参与判定
- ADR-0005 Decision 1：轻量修改 STALE 传播行为不变（字数修改 → Beat STALE + Chapter `targetWordCount` 同步；结构修改 → Beat STALE + Chapter `beatPlan` 同步）
- ADR-0008（新建）：Beat 数据模型从无类型 JSON 升级为强类型顶层列

### 向后兼容
- `targetChapterCount` 和 `defaultWordCount` 可选参数，不传则保持 AI 自决（20-30章、3000字）
- `narrativeSummary` 等新增字段缺失时（V1 旧数据），`toBeat()` 降级推导展示值（空摘要、默认 pacingLabel、从 `plan` 提取的冲突描述），不写回数据库
- 现有轻量修改端点（`PATCH /beats/:beatId/wordcount`、`PATCH /beats/:beatId/structure`）保持不变
- 前端 `BeatsView.spec.ts` 旧测试需重写——新行为（Config Panel 初始态、无自动生成、单列叙事流）与旧测试不可共存

### 实施顺序建议

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **Phase 0 — Schema & 类型** | Prisma 迁移（5 新列）、beat.types.ts、useBeatStore.ts、beats.ts 类型、Prompt 模板更新 | 无 |
| **Phase 1 — 后端核心** | `targetChapterCount` 参数、`adjustBeat` + `/adjust` 端点、`batchAdjustBeats` + `/batch-adjust` 端点、`parseBeatsFromOutput` 扩展、`toBeat` V1 降级 | Phase 0 |
| **Phase 2 — 前端组件** | BeatsConfigPanel（a-segmented 重写）、BeatNarrativeCard（新建，替代旧 BeatChapterCard+BeatEditor）、BeatsRhythmChart（冲突/期待值重写）、BeatsStatsBar（新建）、useBeatsAdjustment（新建）、BeatsView 重构（布局+状态机）、BeatList/BeatEditor 删除、HookDensityChart 脱离 DOM | Phase 1 |
| **Phase 3 — 测试** | BeatsView.spec.ts 重写、BeatNarrativeCard/BeatsConfigPanel/BeatsRhythmChart/BeatsStatsBar/useBeatsAdjustment 新建测试、beats.controller.spec.ts 新端点测试 | Phase 2 |

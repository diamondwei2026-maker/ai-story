---
name: to-issues
description: Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices. Use when user wants to convert a plan into issues, create implementation tickets, or break down work into issues.
---

# To Issues

Break a plan into independently-grabbable issues. Each issue MUST deliver a complete, independently functional capability — a **功能闭环** (functional closed loop).

The issue tracker and triage label vocabulary should have been provided to you — run `/setup-matt-pocock-skills` if not.

## Core rule: 功能闭环拆解 (Functional closed-loop decomposition)

**Every Issue must complete an independent, standalone feature.** This applies regardless of project type (full-stack, frontend-only, backend-only, CLI, library, etc.).

A feature is "closed-loop" when: given only this Issue's work, a user or system can perceive and benefit from the completed capability. No dangling half-features.

## Three-dimension check (3D Check)

For every Issue, check these three dimensions (apply only the ones relevant to the project):

- **Interface (I)**: The external entry point — API endpoint, UI component, CLI command, config key, event. What changed from the outside.
- **Logic (L)**: Internal implementation — transformations, validations, state machines, algorithms, business rules. How it works.
- **Storage (S)**: Data persistence or flow — schema, table, file, queue, cache, in-memory state. What is remembered.

A fully closed-loop Issue touches all three dimensions that apply. If an Issue only changes one dimension (e.g., "add a database column" with no interface or logic), it is NOT a closed loop — merge it into the Issue that uses that column.

### 3D abbreviations for the summary table

In the preview table, express 3D coverage with slash-separated single letters: `I`, `L`, `S`.

| Abbreviation | Meaning |
|---|---|
| `I/L/S` | Full-stack: Interface + Logic + Storage |
| `I/L` | UI/API + Logic, no new storage |
| `L/S` | Logic + Storage, no new interface |
| `I` | Interface-only (rare; suspect incomplete loop) |

## #0 地基阶段与复用识别 (Foundation Phase & Reuse Awareness)

在拆解任何功能切片之前，必须先规划 **#0 Foundation** 阶段。此阶段识别所有可复用基础设施，强制区分 **Create**（新建）与 **Consume/Inject**（复用/注入），防止后端 Service 和前端组件的重复建设。

### 复用决策矩阵

| 标注 | 含义 | 适用场景 |
|---|---|---|
| `Create` | 从零构建，之前不存在 | 全新的 Service、组件、数据表 |
| `Extend` | 基于现有资产增加能力 | 向已有 Service 添加方法、向已有组件添加功能 |
| `Consume` | 直接复用，无需修改被引用实体 | 注入已有 Service、引用已有组件、读写已有表 |

### #0 Issue 类型

#0.x Issue 不直接交付用户可见功能，而是建立后续切片所需的基础设施：

- **#0.1 共享 Service/Util**: 被多个后续 Issue 复用的核心服务（如 `AIService`、`AuthService`）
- **#0.2 共享组件**: 被多个页面复用的 UI 组件（如 `<SharedEditor />`、`<Layout />`）
- **#0.3 数据模型基础**: 核心表结构初始化（如 `[users]` 表、基础 migration）

每个后续 Issue 的原子路径中，每个实体必须使用 `Create`/`Extend`/`Consume` 前缀标注其复用关系。

## 原子级实现路径 (Atomic Implementation Path)

Every Issue MUST specify concrete, named entities at each layer — never generic descriptions. Always bottom-up: (D) → (B) → (F).

### 原子级颗粒度强制规则 (Atomic Granularity Mandate)

| Layer | 禁止 (Prohibited) | 强制 (Required) | 语法格式 (Syntax) | 复用标注 |
|---|---|---|---|---|
| **(D) Storage** | "建表"、"加字段"、"写迁移" | 具体的 `[表名]` 或 `[表名.字段名]` | `Create [table.column]` 或 `Consume [table.column]` | `Create` / `Extend` / `Consume` |
| **(B) Backend** | "写接口"、"写服务"、"实现 API" | 具体的 `[路由路径]` → `[Service名.函数名]` | `Create [METHOD /path] -> [Service.function]` 或 `Extend [Service.function]` | `Create` / `Extend` / `Consume` |
| **(F) Frontend** | "写页面"、"做组件"、"加状态" | 具体的 `<组件名 />`、`use[Hook名]`、`[Store名]` | `Create <Component /> -> useHook` 或 `Consume <Component />` | `Create` / `Extend` / `Consume` |

> **复用标注规则**: 每个实体必须带 `Create`/`Extend`/`Consume` 前缀。`Create` 仅出现在 #0 Foundation 或首次创建该实体的 Issue 中；后续 Issue 引用已建实体时必须使用 `Extend`（修改实体）或 `Consume`（直接引用，不做修改）。

### 语法规范

Express the atomic path inside a single table cell. Use `<br>` to separate layers. Every identifier MUST carry a concise Chinese annotation in parentheses `()` describing its function:

```
(D): Create [table.column] (中文含义) <br> (B): Create [METHOD /path] (接口作用) -> [Service.function] (业务逻辑简述) <br> (F): Create <Component /> (UI功能) -> useHook (逻辑作用)
```

**中文注解强制规则 (Mandatory Chinese Annotation)**:
- 每个技术标识符（表名、字段、路由、Service 函数、组件、Hook、Store）后必须紧跟 `(中文说明)`。
- 中文说明应简洁，6 字以内，描述其业务功能。
- 示例：`[users] (用户表)`、`[AuthService.login] (登录鉴权)`、`<LoginForm /> (登录表单)`、`useAutoSave (自动保存)`。

- **(D)**: 使用 `[表名.字段名] (中文说明)` 格式。单表操作写 `[users] (用户表)`，字段操作写 `[users.avatar_url] (头像URL)`。
- **(B)**: 使用 `[METHOD /api/path] (接口作用) -> [ServiceName.methodName] (业务逻辑)` 格式。多个路由/函数用逗号分隔。
- **(F)**: 使用 `<ComponentName /> (UI功能) -> useHookName (逻辑作用)` 或 `[StoreName] (状态管理)` 格式。多个组件必须全部列出：`<Editor /> (编辑器) + <Toolbar /> (工具栏) -> useAutoSave (自动保存)`。

### 多组件强制列出规则

如果一个 Issue 涉及多个组件/路由/表，**必须在路径中全部列出**，用 `+` 连接。如果颗粒度太粗导致单行无法容纳，**必须拆分为多个子 Issue**。

Omit layers that don't apply.

## AFK / HITL

- **AFK**: Can be implemented and merged without human interaction.
- **HITL**: Requires human interaction — architectural decision, design review, domain judgment call.

Prefer AFK over HITL where possible.

在汇总表中，`[AFK]` 或 `[HITL]` 标记必须紧随任务标题出现：`任务标题 [AFK]` 或 `任务标题 [HITL]`。#0 Foundation Issue 通常为 AFK。

## Process

### 1. Gather context (silent — no terminal output)

Work from conversation context. If the user passes an issue reference (issue number, URL, or path), fetch it from the issue tracker. Do NOT describe this step.

### 2. Explore the codebase if needed (silent — no terminal output)

Understand current code state. Use domain glossary from CONTEXT.md, respect ADRs. Do NOT describe this step.

### 3. Output the summary table directly

Break the plan into **tracer bullet** issues. Internally perform 3D check and (D)/(B)/(F) layered-path planning for each slice. Then output a single Markdown summary table.

After the table (with a blank line separator), output exactly: **"以上为任务提案，是否批准发布？"**

## Summary Table format (terminal preview)

Output ONE table covering all proposed Issues. Do NOT output individual cards or the full Issue body template at this stage.

### 渲染强制规则 (Rendering Enforcement)

1. **禁止代码块包裹**: 表格严禁使用三反引号（```）或任何代码块语法包裹。必须以原始 Markdown 直接输出，确保终端渲染为可视化表格。
2. **强制空行触发**: 表格开始前和结束后各强制一个完整空行。这是 Markdown 渲染器识别表格语法的必要条件。
3. **语法严格校验**:
   - 每一行必须以 `|` 开头并以 `|` 结尾。
   - 对齐行（第二行）必须使用标准格式：`|:---|:---|:---|...|`。注意是 `:---` 而非 `----`。
   - 严禁在表格中使用转义字符。
4. **单元格垂直换行**: 在"原子实现路径"和"验收标准"列中，必须使用 HTML 的 `<br>` 标签进行强制换行，严禁让单行内容过长导致表格横向无限延伸。
5. **预览指令清晰化**: 表格输出后，直接换行显示确认提示"以上为任务提案，是否批准发布？"，不被包含在表格内。

### 输出范例 (Output Example)

（直接输出，不包裹代码块）

| ID | 任务标题 [HITL/AFK] | 3D | 原子实现路径 (D → B → F) | 验收标准 (DoD) |
|:---|:---|:---|:---|:---|
| #0.1 | AI 核心 Service [AFK] | L/S | (B): Create [AIService.stream] (流式生成) | 基础流式响应<br>通过单元测试 |
| #0.2 | 用户表初始化 [AFK] | S | (D): Create [users] (用户表)，含 [users.email] (邮箱) / [users.password_hash] (密码哈希) | DB 可连接且<br>users 表完整 |
| #1.1 | 剧情大纲生成 [AFK] | I/L/S | (D): Create [outlines] (大纲表) <br> (B): Extend [AIService.genOutline] (大纲生成) <br> (F): Consume <SharedEditor /> (共享编辑器) | 页面成功渲染<br>流式文字显示正常 |
| #2.1 | 用户登录 [AFK] | I/L/S | (D): Extend [users.last_login_at] (最后登录时间) <br> (B): Extend [AuthService.issueJWT] (签发令牌) <br> (F): Create <LoginForm /> (登录表单) -> [AuthStore] (认证状态) | 合法用户可登录<br>非法凭据被拒绝<br>Token 持久化 |
| #3.1 | 实时草稿保存 [AFK] | I/L/S | (D): Extend [drafts.last_saved_at] (最后保存时间) <br> (B): Create [PUT /api/drafts/:id] (更新草稿) -> [DraftService.sync] (草稿同步) <br> (F): Create <Editor /> (编辑器) -> useAutoSave (自动保存) | 输入时 DB 实时更新<br>前端显示"已保存" |

### Column rules

- **ID**: Sequential number (`#0.1`, `#1.1`, `#2.1`, …). Use major.minor to group related slices. `#0.x` reserved for Foundation issues.
- **任务标题 [HITL/AFK]**: Short name using project domain glossary from CONTEXT.md and ADRs. Keep under 20 characters. MUST include `[AFK]` or `[HITL]` tag immediately after the title.
- **3D**: Slash-separated dimension letters — `I`, `L`, `S`. Example: `I/L/S`. NOT full sentences.
- **原子实现路径 (Atomic Path)**: 最核心列。Always bottom-up: `(D)` → `(B)` → `(F)`。每层必须使用原子级语法，并带复用标注前缀和中文注解：
  - (D): `Create [表名.字段名] (中文含义)` — 禁止 "建表"、"加字段"。每标识符必须紧跟 `(中文)`。
  - (B): `Create [METHOD /path] (接口作用) -> [Service.method] (业务逻辑)` — 禁止 "写接口"、"实现 API"。
  - (F): `Create <Component /> (UI功能) -> useHook (逻辑作用)` — 禁止 "写页面"、"做组件"。
  - 多实体用 `+` 连接。颗粒度太粗时拆分为多个子 Issue。
  - Use `<br>` to separate layers within the cell. Omit layers that don't apply.
  - `Create` 仅出现在首次创建实体的 Issue（通常为 #0 或首个功能 Issue）；后续引用必须使用 `Extend` 或 `Consume`。
  - 中文注解应 ≤6 字，描述业务功能。路径中 `->` 表示开发先后顺序。
- **验收标准 (DoD)**: 1-3 short acceptance criteria. Each separated by `<br>` within the cell. Each under 20 characters. These are gist only — full criteria go into the published Issue body.

### Prohibitions

- Do NOT output "我正在分析..."、"我认为这个颗粒度很合适..." or any subjective commentary.
- Do NOT repeat background descriptions from the PRD.
- Do NOT output the full Issue body template — only the summary table.
- Do NOT describe the gathering/exploration steps in terminal output.
- Do NOT use long sentences in any table cell.
- Do NOT output individual Issue cards — use only the summary table.
- Do NOT wrap the table in code blocks (```) or blockquote (`>`).
- Do NOT add escape characters inside table cells.
- Do NOT omit blank lines before and after the table.
- Do NOT use vague descriptions in the atomic path. 严禁以下写法：
  - (D): "建表"、"加字段"、"写迁移" → 必须写成 `[表名] (含义)` 或 `[表名.字段名] (含义)`
  - (B): "写接口"、"实现 API"、"写服务" → 必须写成 `[METHOD /path] (作用) -> [Service.method] (逻辑)`
  - (F): "写页面"、"做组件"、"加状态" → 必须写成 `<Component /> (功能) -> useHook (逻辑)` 或 `[Store名] (说明)`
- Do NOT omit Chinese annotations from any technical identifier in the atomic path.
- Do NOT omit entities when an Issue touches multiple components/routes/tables — list all of them with `+` separator.
- Do NOT create coarse-grained Issues that bundle unrelated entities — split into sub-Issues.
- Do NOT skip the #0 Foundation phase — always identify reusable infrastructure before slicing feature Issues.
- Do NOT use `Create` on an entity that already exists — check #0 Foundation and prior Issues first.
- Do NOT omit the `[AFK]`/`[HITL]` tag from any Issue title in the summary table.

## Publish to issue tracker

User confirms with "y" or equivalent affirmative. If the user requests adjustments, modify the table and ask again.

Publish in dependency order (blockers first) so real issue identifiers can be referenced in "Blocked by".

Use the full issue body template below for each published Issue. The published body contains complete detail — the table was a preview.

<issue-template>
## Parent

A reference to the parent issue on the issue tracker (if the source was an existing issue, otherwise omit this section).

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it here and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Three-dimension check

- **Interface**: <how the external world perceives this feature>
- **Logic**: <how it is implemented internally>
- **Storage**: <how data persists or flows>

(Omit dimensions that do not apply to this project.)

## 原子实现路径 (Atomic Implementation Path)

- **(D)**: <[表名.字段名] — e.g., [users.avatar_url], [drafts] 表>
- **(B)**: <[METHOD /path] -> [Service.method] — e.g., [POST /api/auth/login] -> [AuthService.issueJWT]>
- **(F)**: <<Component /> -> useHook | [Store名] — e.g., <LoginForm /> -> [AuthStore], <Editor /> -> useAutoSave>

多实体用 `+` 连接。单 Issue 颗粒度过粗时拆分为多个子 Issue。
(Omit layers that do not apply.)

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking ticket (if any)

Or "None - can start immediately" if no blockers.

</issue-template>

Do NOT close or modify any parent issue.

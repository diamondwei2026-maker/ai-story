# Chapter 独立文档存储（引用模式）

长篇小说 Project 文档采用引用模式存储 Chapter——Project 存元数据，每章正文作为独立 MongoDB 文档通过 `projectId` 关联。

**Context**：一个 Project 可能包含数百至上千个 Chapter，每章含正文、审核结果、指纹、上下文快照等。若嵌入 Project 文档将迅速突破 MongoDB 16MB 限制，且单章修改需要读写整个 Project 文档，带来竞态风险。

**Decision**：Project 与 Chapter 为一对多关系，Chapter 以独立文档存储，通过 `projectId` 关联。Project 可选择性持有 `chapterRefs: [ObjectId]` 用于快速定位（若未配置则通过 Chapter 的 `projectId` 反向查询）。

**Considered Options**：
- 嵌入模式：读全量快、一次查询，但受限于 16MB 且并发写不安全。千章规模不可行。
- 混合模式：前 4 个 Phase 嵌入、Chapter 独立。增加了 schema 复杂度但收益有限，因为其他 Phase 数据量小，不值得引入两套存储模式。

**Consequences**：
- 读取单章需要额外查询，但千章规模下全量加载本来就不可能——按需加载是唯一选择。
- 乐观锁（version 字段 + findOneAndUpdate）解决并发更新 FactSheet 时的竞态问题。

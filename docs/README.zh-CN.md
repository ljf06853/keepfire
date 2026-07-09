<p align="center">
  <img src="../assets/banner.svg" alt="Keepfire" width="100%" />
</p>

<p align="center">
  <strong>你最好的编程提示词，不该死在聊天记录里——而该越用越强。</strong>
</p>

<p align="center">
  <a href="../README.md">English README</a>
  ·
  <a href="https://github.com/ljf06853/keepfire">GitHub</a>
  ·
  <a href="../SKILL.md">SKILL.md</a>
</p>

---

# Keepfire 中文文档

> **English version:** [README.md](../README.md)

Keepfire 是一个 **本地优先** 的编程提示词「配方」系统：

1. 🔥 **收藏（Keep）** — 灵光一现的好问法，一键沉淀  
2. 🧠 **结构化** — 抽成可复用的 skeleton / 约束 / 输出约定  
3. 🎯 **召回并适配（Use）** — 下次相似任务自动匹配，**不是原样粘贴**  
4. 📈 **复利进化** — 评分、改进、版本化，形成你的个人编程手艺库  

同时提供：

- **CLI**（TypeScript）  
- **Agent Skill**（`SKILL.md`，兼容 Claude Code / Codex / Gemini CLI 等）  
- **本地 Markdown 配方库**（`~/.keepfire`）

---

## 目录

- [它解决什么问题](#它解决什么问题)
- [快速开始](#快速开始)
- [安装到各 AI 编程工具](#安装到各-ai-编程工具)
- [核心用法](#核心用法)
- [模式：确认 / 自动](#模式确认--自动)
- [配方长什么样](#配方长什么样)
- [目录结构](#目录结构)
- [Agent 里怎么用](#agent-里怎么用)
- [设计原则](#设计原则)
- [隐私](#隐私)
- [常见问题](#常见问题)
- [路线图](#路线图)

---

## 它解决什么问题

你一定遇到过：

> 同一个 bug 修了三轮，终于写出一个特别好用的 prompt……  
> 下周类似问题又来了，那句「神问法」却找不回来了。

市面上已有「提示词收藏夹」，但往往只是：

- 存原文  
- 靠你自己想起来去搜  
- 粘贴后发现项目名、路径都过期了  

Keepfire 的差别在于 **编程场景的飞轮**：

| 普通收藏夹 | Keepfire |
|-----------|----------|
| 存字符串 | 存 **Recipe（配方）** |
| 原样粘贴 | **召回 + 按新任务改写** |
| 手动分类 | intent / stack / trigger 自动辅助 |
| 用完即止 | `improve` 版本进化 |

一句话：

> **不是 Prompt 仓库，而是会复利的编程手艺系统。**

---

## 快速开始

需要 **Node.js 18+**。

### 方式 A：一键安装脚本

```bash
curl -fsSL https://raw.githubusercontent.com/ljf06853/keepfire/main/install.sh | bash
```

### 方式 B：从源码

```bash
git clone https://github.com/ljf06853/keepfire.git
cd keepfire
npm install
npm run build
npm link          # 可选：全局 keepfire 命令
keepfire init --link claude,codex,gemini,agents,cursor
```

### 30 秒体验

```bash
# 导入示例配方
keepfire import examples/sample-recipes.json

# 按新任务召回并适配
keepfire use --apply "review webhook PR for security"

# 自己收藏一条
keepfire keep \
  --title "最小修复调试循环" \
  --intent debug \
  --prompt "先复现，再定位，再做最小修复，不要顺手重构。" \
  --stack ts \
  --why "先复现|改动最小" \
  --yes

keepfire list
keepfire stats
```

数据默认在：

```text
~/.keepfire/
  config.json
  index.json
  cards/*.md
```

可用环境变量覆盖：

```bash
export KEEPFIRE_HOME=/path/to/my-library
```

---

## 安装到各 AI 编程工具

Keepfire 遵循 **Agent Skills 开放标准**（`SKILL.md`）。  
一份源码，可链接到多个工具目录：

```bash
keepfire init --link claude,codex,gemini,agents,cursor
```

| 工具 | 技能目录 |
|------|----------|
| Claude Code | `~/.claude/skills/keepfire` |
| Codex | `~/.codex/skills/keepfire` 或 `~/.agents/skills/keepfire` |
| Gemini CLI | `~/.gemini/skills/keepfire` |
| 通用标准路径 | `~/.agents/skills/keepfire` |
| Cursor | `~/.cursor/skills/keepfire`（视版本支持情况） |

**国产工具**（通义灵码、Comate、CodeGeeX 等）若尚未统一 Skills 目录，可：

1. 继续用 **CLI**（`keepfire use/keep`）  
2. 把 `use` 输出的适配 prompt 粘贴进对话  
3. 或把仓库链到其自定义指令 / 项目规则目录（见各产品文档）

手动软链示例：

```bash
git clone https://github.com/ljf06853/keepfire.git ~/.keepfire-src
ln -sfn ~/.keepfire-src ~/.claude/skills/keepfire
ln -sfn ~/.keepfire-src ~/.agents/skills/keepfire
```

---

## 核心用法

### 1. 收藏火花：`keep`

```bash
keepfire keep \
  --title "PR 安全审查" \
  --intent security \
  --prompt "审查这个 PR 的安全问题。优先鉴权与注入。输出 Critical/Warning/Suggestion 与修复建议。先别纠结代码风格。" \
  --skeleton "Security-review {{diff}}。
优先：authz、injection、SSRF、密钥泄露。
输出：Critical/Warning/Suggestion + 位置 + 修复。
跳过纯风格问题。

当前任务：
{{task}}" \
  --stack ts,node \
  --tags pr,security \
  --triggers "审PR|security review|安全审查" \
  --constraints "只给可落地发现|不做顺手重构" \
  --output "按严重级别列出问题与修复" \
  --why "强制优先级|修复可执行" \
  --avoid "先喷代码风格" \
  --quality 5 \
  --source claude-code \
  --yes
```

常用参数：

| 参数 | 含义 |
|------|------|
| `--title` | 标题 |
| `--prompt` | 当时真正生效的原文 |
| `--skeleton` | 变量化模板（`{{task}}` `{{diff}}` 等） |
| `--intent` | `implement/debug/review/refactor/test/explain/design/git-pr/perf/security/other` |
| `--stack` | 技术栈标签，逗号分隔 |
| `--triggers` | 召回触发短语，`\|` 分隔 |
| `--constraints` / `--why` / `--avoid` | 约束 / 好在哪 / 避坑，`\|` 分隔 |
| `--yes` | 强制写入（CLI 场景） |

### 2. 召回并适配：`use`

```bash
# 只看候选
keepfire use "用安全审查方式看这个支付 webhook PR"

# 直接应用最佳匹配
keepfire use --apply "用安全审查方式看这个支付 webhook PR"

# 指定 id
keepfire use --id 2026-07-09-pr-security-review-xxxx "重点看签名校验"
```

**关键行为：**  
`use` 会生成「当前任务 + 配方骨架 + 约束 + 质量信号」的**适配后指令**，而不是把旧 prompt 原样贴回去。

### 3. 管理花园：`list` / `search` / `show` / `delete`

```bash
keepfire list
keepfire list --intent security
keepfire search "debug 最小修复"
keepfire show <id>
keepfire delete <id> --yes
```

### 4. 进化配方：`improve`

用过一次觉得更好，就升级版本（保留 parent 关系）：

```bash
keepfire improve <id> \
  --note "补上先写复现步骤" \
  --why "先复现|最小修复" \
  --skeleton "......新骨架......"
```

### 5. 导入导出

```bash
keepfire export ./my-recipes.json
keepfire import ./my-recipes.json
keepfire reindex
keepfire stats
keepfire path
```

---

## 模式：确认 / 自动

```bash
# 查看当前模式
keepfire mode

# 收藏模式：confirm（默认）| auto
keepfire mode capture confirm
keepfire mode capture auto

# 使用模式：always_ask | ask_if_low_confidence（默认）| auto
keepfire mode use ask_if_low_confidence
keepfire mode use auto

# 自动应用置信度阈值（0~1）
keepfire mode threshold 0.88
```

| 模式 | 行为 |
|------|------|
| `capture confirm` | 更稳妥；Agent 侧会先展示草稿再保存 |
| `capture auto` | 你说「收藏」后尽量少确认 |
| `use always_ask` | 永远先列候选 |
| `use ask_if_low_confidence` | 高置信可自动应用，否则请你确认 |
| `use auto` | 始终用最佳匹配 |

说明：

- **自动 ≠ 偷偷学习全部聊天记录**  
- 只在你表达 keep / use 意图时写入或召回  
- 本地库默认不出网  

---

## 配方长什么样

每条配方是一个 Markdown 文件，例如 `~/.keepfire/cards/2026-07-09-....md`：

```markdown
---
id: "..."
title: "PR 安全审查"
intent: "security"
stack_hints: ["ts", "node"]
tags: ["pr", "security"]
trigger_phrases: ["审PR", "security review"]
quality: 5
use_count: 3
...
---

# PR 安全审查

## Raw prompt
（当时生效的原文）

## Skeleton
（带 {{placeholders}} 的模板）

## Constraints
- ...

## Output contract
...

## Why it worked
- ...

## Anti-patterns
- ...
```

**好配方 vs 坏配方：**

- ✅ 编码的是**过程**：复现 → 最小失败测试 → 最小修复 → 验证  
- ❌ 绑死一次性路径/密钥/临时报错原文，无法迁移  

---

## 目录结构（仓库）

```text
keepfire/
├─ README.md                 # 英文主文档
├─ docs/README.zh-CN.md      # 中文文档（本页）
├─ SKILL.md                  # Agent Skill 指令
├─ agents/openai.yaml        # Codex 可选元数据
├─ src/                      # TypeScript CLI 源码
├─ templates/card.md         # 卡片模板
├─ examples/                 # 示例配方
├─ install.sh                # 安装脚本
└─ assets/banner.svg
```

开发：

```bash
npm run build
npm test
npx keepfire help
```

---

## Agent 里怎么用

安装 skill 后，在 Claude Code / Codex 等对话中直接说：

| 你说 | Agent 应做 |
|------|------------|
| 「收藏这个问法」/ `keep this` / `/keep` | 抽取配方 → 确认或自动保存 |
| 「用我以前审 PR 的方式」/ `/use` | 搜索库 → 适配 → 执行任务 |
| 「列出我的配方」/ `/garden` | list / search / 管理模式 |
| 「这次更好，升级配方」 | `improve` 出新版本 |

Skill 完整行为说明见仓库根目录 [`SKILL.md`](../SKILL.md)。

---

## 设计原则

1. **本地优先** — 数据在你机器上，可 git 备份  
2. **适配优先于粘贴** — 旧上下文必须重填  
3. **编程垂直** — intent 枚举服务 coding，不是万能写作库  
4. **可移植** — `SKILL.md` 开放标准 + 独立 CLI  
5. **可进化** — parent_id / version 形成改进链  
6. **低摩擦** — confirm / auto 可选，命令与自然语言都可  

---

## 隐私

- 配方默认只存在 `KEEPFIRE_HOME` / `~/.keepfire`  
- **不要**把 token、私钥、生产密钥写进 prompt  
- Skill 指示 Agent 遇到密钥应脱敏  
- 导出文件请自行保管  

---

## 常见问题

**Q: 和 ChatGPT/Claude 网页收藏夹有什么区别？**  
A: Keepfire 面向 **编程 Agent 工作流**，强调 skeleton、适配执行、多工具一份库，而不是网页书签。

**Q: 必须装 CLI 吗？**  
A: 推荐装。没有 CLI 时，Agent 也可按 `SKILL.md` 直接读写 `~/.keepfire/cards`，但体验与一致性会差一些。

**Q: 召回不准怎么办？**  
A: 补全 `trigger_phrases` / `tags` / `stack`；或 `use --id` 指定；后续版本会加强语义检索。

**Q: 能团队共享吗？**  
A: MVP 以个人库为主。你可以把 `cards/` 放进 git 仓库，或用 `export/import` 分发；团队权限与云同步在路线图中。

**Q: npm 上还搜不到？**  
A: 可先从 GitHub 源码 `npm link` / `install.sh` 使用；发布 npm 包可在后续版本进行。

---

## 路线图

- [x] 本地 Markdown 配方库  
- [x] CLI：keep / use / search / improve / export  
- [x] 可移植 `SKILL.md`  
- [x] confirm / auto 模式  
- [x] 中英文文档  
- [ ] 可选本地 embedding 语义检索  
- [ ] 从会话日志一键提取「最终生效 prompt」  
- [ ] 配方包发布（个人/团队）  
- [ ] 网页端 Chat 插件  

欢迎 Issue / PR：  
https://github.com/ljf06853/keepfire/issues

---

## 许可证

[MIT](../LICENSE) © 2026 ljf06853

---

<p align="center">
  <sub>如果 Keepfire 帮你留住过一次「神 prompt」，请点一个 ⭐ —— 火花需要氧气。</sub>
</p>

<p align="center">
  <a href="../README.md">English README</a>
</p>

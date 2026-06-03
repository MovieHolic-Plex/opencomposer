# opencomposer

OpenComposer 是一个面向 Cursor Composer 2.5 的 OpenCode fork，用来提供更好的终端
界面。

Composer 2.5 只能通过 Cursor Agent 使用。OpenComposer 不重新实现模型；它保留 Cursor
Agent 作为 runtime backend，并在前面放置一个 OpenTUI 驱动的 interface。

Translations: [English](README.md), [한국어](README.ko.md),
[日本語](README.ja.md), [繁體中文](README.zht.md).

## 已可使用

- 默认模型：`composer-2.5`
- 默认命令：`opencomposer`
- 默认 UI：OpenTUI session surface，包含 transcript、composer input、status，以及顶部
  header 中的 compact workflow progress
- backend：`cursor-agent --model composer-2.5 --print --trust --force`
- workflow：interactive turn 会按 `deep-interview -> ralplan -> ultragoal -> execute`
  顺序运行。设置 `OPENCOMPOSER_ENABLE_TEAM=1` 后，会在 execution 前加入 optional
  `team` stage。
- Deep interview gate：除非 prompt 明确要求跳过，否则 TUI 会先提 interview 问题；在收到
  回答前不会启动 `ralplan`、`ultragoal` 或 `execute`。
- state：每次 workflow update 都会写入 `.opencomposer/workflow.json`。
- 后续对话：TUI follow-up turn 会通过 `--continue` 发送
- YOLO mode：`--yolo` 会传递 Cursor Agent unattended execution flags
- 备用路径：`--headless`, `--acp`, experimental `--opencode-tui`

## 快速开始

在 checked-out repository 中：

```bash
bun install
ln -sf "$PWD/packages/opencode/bin/opencomposer" ~/.local/bin/opencomposer

cd /path/to/your/project
opencomposer
```

常用命令：

```bash
opencomposer --yolo
OPENCOMPOSER_ENABLE_TEAM=1 opencomposer
opencomposer --headless "fix the failing tests"
opencomposer --headless --yolo "run the migration and fix errors"
opencomposer --acp
opencomposer --opencode-tui
```

检查命令连接：

```bash
opencomposer --dry-run
opencomposer --dry-run --headless "fix tests"
opencomposer --dry-run --acp
```

预期输出：

```bash
opencomposer-tui --backend cursor-agent --model composer-2.5
cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'
cursor-agent --model composer-2.5 acp
```

## 当前限制

OpenComposer 目前仍是 bridge layer，不是完整的 OpenCode rearchitecture。

- Cursor Agent 仍然是 model runtime。
- 模型选择受 Cursor Agent model ID 限制。
- 默认 OpenComposer TUI 是为 bridge 直接构建的 OpenTUI-based surface。
- upstream OpenCode TUI 保留在 `--opencode-tui` 下，但尚未完全连接到 Composer sessions。

## 开发

OpenComposer code 位于 `packages/opencode/src/opencomposer`。

请在 package directory 中运行检查：

```bash
cd packages/opencode
bun test test/opencomposer/cursor-agent.test.ts test/opencomposer/cli.test.ts test/opencomposer/opencode-tui.test.ts test/opencomposer/tui.test.ts test/opencomposer/workflow.test.ts
bun typecheck
```

## 安全

OpenComposer 会在当前 project directory 中以 child process 方式运行 Cursor Agent。
`--yolo` 是 unattended execution mode，会传递 Cursor Agent approval flags，因此可能允许
较广泛的 tool execution。

不要把 Cursor credentials、project secrets、`.env` files、private keys 或 local
Cursor/agent state 发布到公开 repository。

## 与 OpenCode / Cursor 的关系

This is an independent fork. 它不是由 OpenCode 或 Cursor 构建、赞助或背书的项目。

OpenCode source and license notices are preserved under the MIT License.

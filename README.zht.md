# opencomposer

OpenComposer 是面向 Cursor Composer 2.5 的 OpenCode fork，用來提供更好的終端介面。

Composer 2.5 只能透過 Cursor Agent 使用。OpenComposer 不重新實作模型；它保留 Cursor
Agent 作為 runtime backend，並在前面放置 OpenTUI 驅動的 interface。

Translations: [English](README.md), [한국어](README.ko.md),
[日本語](README.ja.md), [简体中文](README.zh.md).

## 已可使用

- 預設模型：`composer-2.5`
- 預設命令：`opencomposer`
- 預設 UI：OpenTUI session surface，包含 transcript、composer input、status，以及頂部
  header 中的 compact workflow progress
- backend：`cursor-agent --model composer-2.5 --print --trust --force`
- workflow：interactive turn 會按 `deep-interview -> ralplan -> ultragoal -> execute`
  順序執行。設定 `OPENCOMPOSER_ENABLE_TEAM=1` 後，會在 execution 前加入 optional
  `team` stage。
- Deep interview gate：除非 prompt 明確要求跳過，否則 TUI 會先提出 interview 問題；在收到
  回答前不會啟動 `ralplan`、`ultragoal` 或 `execute`。
- state：每次 workflow update 都會寫入 `.opencomposer/workflow.json`。
- 後續對話：TUI follow-up turn 會透過 `--continue` 傳送
- YOLO mode：`--yolo` 會傳遞 Cursor Agent unattended execution flags
- 備用路徑：`--headless`, `--acp`, experimental `--opencode-tui`

## 快速開始

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

檢查命令連接：

```bash
opencomposer --dry-run
opencomposer --dry-run --headless "fix tests"
opencomposer --dry-run --acp
```

預期輸出：

```bash
opencomposer-tui --backend cursor-agent --model composer-2.5
cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'
cursor-agent --model composer-2.5 acp
```

## 目前限制

OpenComposer 目前仍是 bridge layer，不是完整的 OpenCode rearchitecture。

- Cursor Agent 仍然是 model runtime。
- 模型選擇受 Cursor Agent model ID 限制。
- 預設 OpenComposer TUI 是為 bridge 直接建立的 OpenTUI-based surface。
- upstream OpenCode TUI 保留在 `--opencode-tui` 下，但尚未完全連接到 Composer sessions。

## 開發

OpenComposer code 位於 `packages/opencode/src/opencomposer`。

請在 package directory 中執行檢查：

```bash
cd packages/opencode
bun test test/opencomposer/cursor-agent.test.ts test/opencomposer/cli.test.ts test/opencomposer/opencode-tui.test.ts test/opencomposer/tui.test.ts test/opencomposer/workflow.test.ts
bun typecheck
```

## 安全

OpenComposer 會在目前 project directory 中以 child process 方式執行 Cursor Agent。
`--yolo` 是 unattended execution mode，會傳遞 Cursor Agent approval flags，因此可能允許
較廣泛的 tool execution。

不要把 Cursor credentials、project secrets、`.env` files、private keys 或 local
Cursor/agent state 發布到公開 repository。

## 與 OpenCode / Cursor 的關係

This is an independent fork. 它不是由 OpenCode 或 Cursor 建立、贊助或背書的專案。

OpenCode source and license notices are preserved under the MIT License.

# opencomposer

OpenComposer は、Cursor Composer 2.5 をより使いやすい terminal surface で扱うための
OpenCode fork です。

Composer 2.5 は Cursor Agent 経由でのみ利用できます。OpenComposer はモデルを再実装
しません。Cursor Agent を runtime backend として使い、その前面に OpenTUI ベースの
interface を置きます。

Translations: [English](README.md), [한국어](README.ko.md),
[简体中文](README.zh.md), [繁體中文](README.zht.md).

## 現在動くもの

- default model: `composer-2.5`
- default command: `opencomposer`
- default UI: transcript、composer input、status、top header の compact workflow progress
  を持つ OpenTUI session surface
- backend: `cursor-agent --model composer-2.5 --print --trust --force`
- workflow: interactive turn は `deep-interview -> ralplan -> ultragoal -> execute`
  の順に実行します。`OPENCOMPOSER_ENABLE_TEAM=1` を指定すると execution 前に optional
  `team` stage も実行します。
- Deep interview gate: prompt で明示的に skip しない限り、TUI が interview 質問を出し、
  回答が入るまで `ralplan`, `ultragoal`, `execute` を開始しません。
- state: workflow update は毎回 `.opencomposer/workflow.json` に保存されます。
- follow-up turns: TUI の後続 turn は `--continue` で送信
- YOLO mode: `--yolo` が Cursor Agent の unattended 実行 flag を渡します
- escape hatches: `--headless`, `--acp`, experimental `--opencode-tui`

## Quick Start

checked-out repository から:

```bash
bun install
ln -sf "$PWD/packages/opencode/bin/opencomposer" ~/.local/bin/opencomposer

cd /path/to/your/project
opencomposer
```

よく使うコマンド:

```bash
opencomposer --yolo
OPENCOMPOSER_ENABLE_TEAM=1 opencomposer
opencomposer --headless "fix the failing tests"
opencomposer --headless --yolo "run the migration and fix errors"
opencomposer --acp
opencomposer --opencode-tui
```

command wiring の確認:

```bash
opencomposer --dry-run
opencomposer --dry-run --headless "fix tests"
opencomposer --dry-run --acp
```

Expected output:

```bash
opencomposer-tui --backend cursor-agent --model composer-2.5
cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'
cursor-agent --model composer-2.5 acp
```

## 制限

OpenComposer はまだ bridge layer であり、OpenCode 全体を再設計したものではありません。

- model runtime は Cursor Agent のままです。
- model selection は Cursor Agent model ID に制限されます。
- default OpenComposer TUI は bridge 用に作った OpenTUI-based surface です。
- upstream OpenCode TUI は `--opencode-tui` として残していますが、Composer session に
  完全には接続されていません。

## Development

OpenComposer code は `packages/opencode/src/opencomposer` にあります。

checks は package directory から実行します。

```bash
cd packages/opencode
bun test test/opencomposer/cursor-agent.test.ts test/opencomposer/cli.test.ts test/opencomposer/opencode-tui.test.ts test/opencomposer/tui.test.ts test/opencomposer/workflow.test.ts
bun typecheck
```

## Security

OpenComposer は現在の project directory で Cursor Agent を child process として実行
します。`--yolo` は unattended execution mode であり、Cursor Agent approval flags を
渡すため広い tool execution を許可する可能性があります。

Cursor credentials、project secrets、`.env` files、private keys、local Cursor/agent
state を公開 repository に含めないでください。

## OpenCode / Cursor との関係

This is an independent fork. OpenCode または Cursor によって作成、支援、承認された
project ではありません。

OpenCode source and license notices are preserved under the MIT License.

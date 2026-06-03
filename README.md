# opencomposer

OpenComposer is an OpenCode fork for people who want a better terminal surface
around Cursor Composer 2.5.

Composer 2.5 is only available through Cursor Agent. OpenComposer does not try
to reimplement the model. It keeps Cursor Agent as the runtime backend and puts
an OpenTUI-powered interface in front of it.

Maintained translations: [한국어](README.ko.md), [日本語](README.ja.md),
[简体中文](README.zh.md), [繁體中文](README.zht.md).

## What Works

- Default model: `composer-2.5`
- Default command: `opencomposer`
- Default UI: OpenTUI session surface with transcript, composer input, status,
  and a workflow/sidebar rail on wide terminals
- Backend: `cursor-agent --model composer-2.5 --print --trust --force`
- Follow-up turns: the TUI sends later turns with `--continue`
- YOLO mode: `--yolo` forwards unattended Cursor Agent flags
- Escape hatches: `--headless`, `--acp`, and experimental `--opencode-tui`

## Quick Start

From a checked-out copy:

```bash
bun install
ln -sf "$PWD/packages/opencode/bin/opencomposer" ~/.local/bin/opencomposer

cd /path/to/your/project
opencomposer
```

Useful variants:

```bash
opencomposer --yolo
opencomposer --headless "fix the failing tests"
opencomposer --headless --yolo "run the migration and fix errors"
opencomposer --acp
opencomposer --opencode-tui
```

Dry-run the command wiring:

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

## Current Limits

OpenComposer is still a bridge layer, not a complete OpenCode rearchitecture.

- Cursor Agent remains the model runtime.
- Model selection is limited to Cursor Agent model IDs.
- The default OpenComposer TUI is OpenTUI-based and custom-built for the bridge.
- The upstream OpenCode TUI is preserved under `--opencode-tui`, but it is not
  fully wired to Composer sessions yet.

## Development

OpenComposer lives under `packages/opencode/src/opencomposer`.

Run checks from the package directory:

```bash
cd packages/opencode
bun test test/opencomposer/cursor-agent.test.ts test/opencomposer/cli.test.ts test/opencomposer/opencode-tui.test.ts test/opencomposer/tui.test.ts
bun typecheck
```

## Security

OpenComposer shells out to Cursor Agent in the current project directory. Treat
`--yolo` as an unattended execution mode: it passes Cursor Agent approval flags
and can allow broad tool execution.

Do not publish Cursor credentials, project secrets, `.env` files, private keys,
or local Cursor/agent state.

## Relationship To OpenCode And Cursor

This is an independent fork. It is not built, sponsored, or endorsed by OpenCode
or Cursor.

OpenCode source and license notices are preserved under the MIT License.

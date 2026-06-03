# opencomposer

opencomposer is a Composer 2.5 focused fork of OpenCode.

The goal is not to reimplement the model. Composer 2.5 is only available through
Cursor Agent, so opencomposer uses Cursor Agent as the model/runtime backend and
adapts OpenCode's terminal product surface around it.

## Current Status

This repository is at the fork-foundation stage.

- Upstream base: `anomalyco/opencode` / `sst/opencode`, default branch `dev`
- License: MIT, inherited from OpenCode
- Default model: `composer-2.5`
- Runtime backend: `cursor-agent`
- First bridge: `packages/opencode/src/opencomposer`

The `opencomposer` command opens the Cursor Agent interactive TUI with
`composer-2.5` by default. Headless and ACP modes use the same default model.
The upstream OpenCode TUI shell is not wired to the Composer backend yet, so it
is exposed separately through the experimental `--opencode-tui` option.

## Usage

From this repo:

```bash
opencomposer
opencomposer "fix tests"
opencomposer --yolo "fix tests"
opencomposer --opencode-tui
```

Without installing, from this repository:

```bash
bun run --cwd packages/opencode opencomposer --dry-run
bun run --cwd packages/opencode opencomposer --dry-run "fix tests"
bun run --cwd packages/opencode opencomposer --dry-run --opencode-tui
```

Expected dry run:

```bash
cursor-agent --model composer-2.5
cursor-agent --model composer-2.5 'fix tests'
cd .../packages/opencode && bun run --conditions=browser .../src/index.ts ...
```

Headless / ACP bridge:

```bash
bun run --cwd packages/opencode opencomposer --dry-run --headless "fix tests"
# cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'

bun run --cwd packages/opencode opencomposer --dry-run --acp
# cursor-agent --model composer-2.5 acp
```

Yolo:

```bash
opencomposer --yolo
opencomposer --headless --yolo "fix tests"
```

Default TUI/headless/ACP yolo passes `--yolo --sandbox disabled --approve-mcps`
to Cursor Agent. `--opencode-tui --yolo` injects
`OPENCODE_PERMISSION='{"*":"allow"}'` only into that child process.

Override the model when needed:

```bash
bun run --cwd packages/opencode opencomposer --dry-run --model composer-2.5-fast --acp
```

## Roadmap

1. Keep the upstream OpenCode TUI and build system available.
2. Replace the model/runtime path with a Cursor Agent ACP client.
3. Route the OpenCode TUI session surface through Cursor ACP updates.
4. Preserve Composer 2.5 as the default model and show it explicitly in the UI.
5. Rework provider/model settings so they do not pretend Composer 2.5 is a normal
   OpenCode provider model.

## Fork Notice

opencomposer is an independent fork for Cursor Composer 2.5 workflows. It is not
built by, sponsored by, or affiliated with the OpenCode team.

OpenCode source and license are preserved under the MIT License in this fork.

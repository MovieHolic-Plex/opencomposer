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

The first committed bridge can run Cursor Agent in headless or ACP mode with
`--model composer-2.5` always set unless explicitly overridden.

## Usage

From this repo:

```bash
bun run --cwd packages/opencode opencomposer --dry-run "fix tests"
```

Expected dry run:

```bash
cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'
```

ACP mode:

```bash
bun run --cwd packages/opencode opencomposer --dry-run --acp
# cursor-agent --model composer-2.5 acp
```

Override, when needed:

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

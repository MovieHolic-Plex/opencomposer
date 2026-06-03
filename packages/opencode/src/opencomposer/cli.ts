#!/usr/bin/env bun
import { DEFAULT_CURSOR_AGENT_BIN, buildCursorAgentArgs, formatShellCommand } from "./cursor-agent"
import { buildOpencodeTuiCommand } from "./opencode-tui"
import { createOpenComposerTuiDryRun, runOpenComposerTui } from "./tui"

type CliOptions = {
  readonly bin: string
  readonly dryRun: boolean
  readonly mode: "acp" | "headless" | "opencode-tui" | "tui"
  readonly model?: string
  readonly project?: string
  readonly prompt?: string
  readonly yolo: boolean
}

class UsageError extends Error {
  constructor(readonly detail: string) {
    super(detail)
    this.name = "UsageError"
  }
}

export async function main(argv: readonly string[]) {
  const options = parseArgs(argv)
  if (options.mode === "tui") {
    if (options.dryRun) {
      process.stdout.write(
        createOpenComposerTuiDryRun({
          backend: options.bin,
          model: options.model,
          prompt: options.prompt,
          yolo: options.yolo,
        }) + "\n",
      )
      return 0
    }
    return await runOpenComposerTui({
      backend: options.bin,
      model: options.model,
      prompt: options.prompt,
      yolo: options.yolo,
    })
  }
  const command =
    options.mode === "opencode-tui"
      ? buildOpencodeTuiCommand({
          model: options.model,
          project: options.project,
          prompt: options.prompt,
          yolo: options.yolo,
        })
      : {
          bin: options.bin,
          args: buildCursorAgentArgs({
            mode: options.mode,
            model: options.model,
            prompt: options.prompt,
            yolo: options.yolo,
          }),
        }
  if (options.dryRun) {
    process.stdout.write(formatShellCommand(command) + "\n")
    return 0
  }

  const proc = Bun.spawn([command.bin, ...command.args], {
    cwd: command.cwd,
    env: command.env ? { ...process.env, ...command.env } : process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  return await proc.exited
}

function parseArgs(argv: readonly string[]): CliOptions {
  const state = parseFlags(argv)
  return {
    bin: state.bin,
    dryRun: state.dryRun,
    mode: state.mode ?? "tui",
    ...(state.model && { model: state.model }),
    ...(state.project && { project: state.project }),
    ...(state.prompt.length > 0 && { prompt: state.prompt.join(" ") }),
    yolo: state.yolo,
  }
}

type ParseState = {
  bin: string
  dryRun: boolean
  mode: "acp" | "headless" | "opencode-tui" | "tui" | undefined
  model: string | undefined
  project: string | undefined
  prompt: string[]
  yolo: boolean
}

function parseFlags(argv: readonly string[]): ParseState {
  const state: ParseState = {
    bin: process.env.OPENCOMPOSER_CURSOR_AGENT_BIN ?? DEFAULT_CURSOR_AGENT_BIN,
    dryRun: false,
    mode: undefined,
    model: undefined,
    project: undefined,
    prompt: [],
    yolo: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") {
      state.dryRun = true
      continue
    }
    if (arg === "--acp") {
      state.mode = "acp"
      continue
    }
    if (arg === "--tui") {
      state.mode = "tui"
      continue
    }
    if (arg === "--opencode-tui") {
      state.mode = "opencode-tui"
      continue
    }
    if (arg === "--headless") {
      state.mode = "headless"
      continue
    }
    if (arg === "--yolo") {
      state.yolo = true
      continue
    }
    if (arg === "--model" || arg === "-m") {
      state.model = requireValue(argv[index + 1], arg)
      index += 1
      continue
    }
    if (arg === "--project") {
      state.project = requireValue(argv[index + 1], arg)
      index += 1
      continue
    }
    if (arg === "--cursor-agent-bin") {
      state.bin = requireValue(argv[index + 1], arg)
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(helpText())
      process.exit(0)
    }
    state.prompt.push(arg)
  }

  return state
}

function requireValue(value: string | undefined, flag: string) {
  if (value) return value
  throw new UsageError(`${flag} requires a value`)
}

function helpText() {
  return [
    "opencomposer - Composer 2.5 through Cursor Agent",
    "",
    "Usage:",
    "  opencomposer [--dry-run] [--model composer-2.5] [--yolo] [prompt]",
    "  opencomposer --headless [--yolo] <prompt>",
    "  opencomposer --acp [--yolo]",
    "  opencomposer --opencode-tui [--project <path>]",
    "",
    "Options:",
    "  --model, -m <id>          Cursor Agent model, defaults to composer-2.5",
    "  --tui                    Start the opencomposer TUI (default)",
    "  --opencode-tui           Start the upstream OpenCode TUI shell",
    "  --acp                    Start cursor-agent ACP mode",
    "  --headless               Force headless prompt mode",
    "  --yolo                   Run unattended through the Composer backend",
    "  --project <path>          Project directory for TUI mode",
    "  --cursor-agent-bin <bin>  Cursor Agent executable",
    "  --dry-run                Print the command without executing",
    "",
  ].join("\n")
}

if (import.meta.main) {
  const code = await main(process.argv.slice(2)).catch((error: unknown) => {
    if (error instanceof UsageError) {
      process.stderr.write(error.detail + "\n")
      return 2
    }
    throw error
  })
  process.exit(code)
}

#!/usr/bin/env bun
import { DEFAULT_CURSOR_AGENT_BIN, buildCursorAgentArgs, formatCursorAgentCommand } from "./cursor-agent"

type CliOptions = {
  readonly bin: string
  readonly dryRun: boolean
  readonly mode: "acp" | "headless"
  readonly model?: string
  readonly prompt?: string
}

class UsageError extends Error {
  constructor(readonly detail: string) {
    super(detail)
    this.name = "UsageError"
  }
}

export async function main(argv: readonly string[]) {
  const options = parseArgs(argv)
  const command = {
    bin: options.bin,
    args: buildCursorAgentArgs({
      mode: options.mode,
      model: options.model,
      prompt: options.prompt,
    }),
  }
  if (options.dryRun) {
    process.stdout.write(formatCursorAgentCommand(command) + "\n")
    return 0
  }

  const proc = Bun.spawn([command.bin, ...command.args], {
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
    mode: state.mode ?? (state.prompt.length > 0 ? "headless" : "acp"),
    ...(state.model && { model: state.model }),
    ...(state.prompt.length > 0 && { prompt: state.prompt.join(" ") }),
  }
}

type ParseState = {
  bin: string
  dryRun: boolean
  mode: "acp" | "headless" | undefined
  model: string | undefined
  prompt: string[]
}

function parseFlags(argv: readonly string[]): ParseState {
  const state: ParseState = {
    bin: process.env.OPENCOMPOSER_CURSOR_AGENT_BIN ?? DEFAULT_CURSOR_AGENT_BIN,
    dryRun: false,
    mode: undefined,
    model: undefined,
    prompt: [],
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
    if (arg === "--headless") {
      state.mode = "headless"
      continue
    }
    if (arg === "--model" || arg === "-m") {
      state.model = requireValue(argv[index + 1], arg)
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
    "  opencomposer [--dry-run] [--model composer-2.5] <prompt>",
    "  opencomposer --acp",
    "",
    "Options:",
    "  --model, -m <id>          Cursor Agent model, defaults to composer-2.5",
    "  --acp                    Start cursor-agent ACP mode",
    "  --headless               Force headless prompt mode",
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

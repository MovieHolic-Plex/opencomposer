import { DEFAULT_COMPOSER_MODEL, DEFAULT_CURSOR_AGENT_BIN, type CursorAgentCommand } from "./cursor-agent"
export { isSubmitKey } from "./keyboard"
import { runOpenComposerOpenTui } from "./opentui"
import type { TuiEntry } from "./tui-render"

type TuiOptions = {
  readonly backend?: string
  readonly model?: string
  readonly prompt?: string
  readonly yolo?: boolean
}

type BackendInput = Required<Pick<TuiOptions, "backend" | "prompt">> &
  Pick<TuiOptions, "model" | "yolo"> & {
    readonly turn: "first" | "follow-up"
  }

type BackendResult = {
  readonly output: string
  readonly status: number
}

export function selectOpenComposerTuiRunner(input: {
  readonly prompt?: string
  readonly stdinTty?: boolean
  readonly stdoutTty?: boolean
}) {
  if (input.stdinTty && input.stdoutTty) return "opentui"
  if (input.prompt) return "headless"
  return "noop"
}

export function createOpenComposerTuiDryRun(options: TuiOptions) {
  const model = options.model?.trim() || DEFAULT_COMPOSER_MODEL
  return [
    "opencomposer-tui",
    "--backend",
    options.backend ?? DEFAULT_CURSOR_AGENT_BIN,
    "--model",
    model,
    ...(options.yolo ? ["--yolo"] : []),
    ...(options.prompt ? ["--prompt", quoteShellSegment(options.prompt)] : []),
  ].join(" ")
}

export function createTuiBackendCommand(input: BackendInput): CursorAgentCommand {
  const model = input.model?.trim() || DEFAULT_COMPOSER_MODEL
  const yoloArgs = input.yolo ? ["--yolo", "--sandbox", "disabled", "--approve-mcps"] : []
  return {
    bin: input.backend,
    args: [
      "--model",
      model,
      ...yoloArgs,
      ...(input.turn === "follow-up" ? ["--continue"] : []),
      "--print",
      "--trust",
      "--force",
      "--output-format",
      "text",
      input.prompt,
    ],
  }
}

export async function runOpenComposerTui(options: TuiOptions) {
  const backend = options.backend ?? DEFAULT_CURSOR_AGENT_BIN
  const runner = selectOpenComposerTuiRunner({
    prompt: options.prompt,
    stdinTty: process.stdin.isTTY,
    stdoutTty: process.stdout.isTTY,
  })
  if (runner === "headless") {
    if (!options.prompt) return 0
    return printBackendResult(
      await runBackendTurn(createTuiBackendCommand({ backend, prompt: options.prompt, turn: "first", ...options })),
    )
  }
  if (runner === "noop") return 0

  return await runOpenComposerOpenTui({
    backend: async (input) => {
      const result = await runBackendTurn(
        createTuiBackendCommand({
          backend,
          prompt: input.prompt,
          turn: input.turn,
          model: options.model,
          yolo: options.yolo,
        }),
      )
      return { entries: outputEntries(result.output), status: result.status }
    },
    initial: {
      cwd: process.cwd(),
      entries: [{ kind: "system", text: "opencomposer ready. Type a task and press Enter." }],
      hasSession: false,
      input: options.prompt ?? "",
      phase: "editing",
      status: "READY",
    },
    model: options.model,
    yolo: options.yolo,
  })
}

async function runBackendTurn(command: CursorAgentCommand): Promise<BackendResult> {
  const proc = Bun.spawn([command.bin, ...command.args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, status] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { output: [stdout, stderr].filter((part) => part.trim().length > 0).join("\n"), status }
}

function outputEntries(output: string): readonly TuiEntry[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((text) => ({ kind: "agent", text }))
}

function printBackendResult(result: BackendResult) {
  if (result.output.length > 0) process.stdout.write(result.output)
  if (result.output.length > 0 && !result.output.endsWith("\n")) process.stdout.write("\n")
  return result.status
}

function quoteShellSegment(segment: string) {
  if (/^[A-Za-z0-9_/:=.,@%+-]+$/.test(segment)) return segment
  return `'${segment.replaceAll("'", "'\"'\"'")}'`
}

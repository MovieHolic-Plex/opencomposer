import { DEFAULT_COMPOSER_MODEL, DEFAULT_CURSOR_AGENT_BIN, type CursorAgentCommand } from "./cursor-agent"
import { readCursorStreamJson } from "./cursor-stream"
import { runOpenComposerOpenTui } from "./opentui"
import { runWorkflowTurn, writeWorkflowState, type WorkflowProgress, type WorkflowStageId } from "./workflow"
export { isSubmitKey } from "./keyboard"

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

type BackendRunOptions = {
  readonly onEntry?: WorkflowProgress
  readonly stage?: WorkflowStageId
  readonly streamJson?: boolean
}

type BackendStageInput = BackendInput & {
  readonly outputFormat?: "stream-json" | "text"
  readonly stage?: WorkflowStageId
  readonly streamPartialOutput?: boolean
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

export function createTuiBackendCommand(input: BackendStageInput): CursorAgentCommand {
  const model = input.model?.trim() || DEFAULT_COMPOSER_MODEL
  const yoloArgs = input.yolo ? ["--yolo", "--sandbox", "disabled", "--approve-mcps"] : []
  const outputFormat = input.outputFormat ?? "text"
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
      outputFormat,
      ...(input.streamPartialOutput ? ["--stream-partial-output"] : []),
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
      const result = await runWorkflowTurn({
        backend: async (stageInput) => {
          const stageResult = await runBackendTurn(
            createTuiBackendCommand({
              backend,
              outputFormat: "stream-json",
              prompt: stageInput.prompt,
              stage: stageInput.stage,
              streamPartialOutput: true,
              turn: stageInput.turn,
              model: options.model,
              yolo: options.yolo,
            }),
            {
              onEntry: stageInput.onEntry,
              stage: stageInput.stage,
              streamJson: true,
            },
          )
          return { output: stageResult.output, status: stageResult.status }
        },
        onProgress: (entry) => {
          input.onEntry?.(entry)
        },
        onUpdate: async (workflow) => {
          input.onWorkflowUpdate?.(workflow)
          await writeWorkflowState({ workflow })
        },
        prompt: input.prompt,
        resultEntries: "none",
        teamEnabled: process.env.OPENCOMPOSER_ENABLE_TEAM === "1",
        turn: input.turn,
      })
      return { entries: result.entries, status: result.status, workflow: result.workflow }
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

async function runBackendTurn(command: CursorAgentCommand, options: BackendRunOptions = {}): Promise<BackendResult> {
  const proc = Bun.spawn([command.bin, ...command.args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const stdoutPromise =
    options.streamJson && options.stage
      ? readCursorStreamJson({ onEntry: options.onEntry, stage: options.stage, stream: proc.stdout })
      : new Response(proc.stdout).text()
  const [stdout, stderr, status] = await Promise.all([stdoutPromise, new Response(proc.stderr).text(), proc.exited])
  return { output: [stdout, stderr].filter((part) => part.trim().length > 0).join("\n"), status }
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

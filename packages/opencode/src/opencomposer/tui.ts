import { DEFAULT_COMPOSER_MODEL, DEFAULT_CURSOR_AGENT_BIN, type CursorAgentCommand } from "./cursor-agent"
import { renderOpenComposerFrame, type TuiEntry } from "./tui-render"

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

type State = {
  readonly cwd: string
  readonly entries: readonly TuiEntry[]
  readonly hasSession: boolean
  readonly input: string
  readonly phase: "editing" | "running"
  readonly status: string
}

type BackendResult = {
  readonly output: string
  readonly status: number
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
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (!options.prompt) return 0
    return printBackendResult(
      await runBackendTurn(createTuiBackendCommand({ backend, prompt: options.prompt, turn: "first", ...options })),
    )
  }

  return await runRawTui(
    {
      cwd: process.cwd(),
      entries: [{ kind: "system", text: "opencomposer ready. Type a task and press Enter." }],
      hasSession: false,
      input: options.prompt ?? "",
      phase: "editing",
      status: "READY",
    },
    options,
    backend,
  )
}

async function runRawTui(initial: State, options: TuiOptions, backend: string) {
  let state = initial
  let exitCode = 0
  let closed = false
  const stdin = process.stdin

  const setState = (next: State) => {
    state = next
    render(state, options)
  }
  const close = () => {
    closed = true
    stdin.setRawMode(false)
    stdin.pause()
    process.stdout.write("\x1b[?25h\x1b[0m\x1b[2J\x1b[H")
  }
  const submit = async (text: string) => {
    const prompt = text.trim()
    if (!prompt || state.phase === "running") return
    setState({
      ...state,
      entries: [...state.entries, { kind: "user", text: prompt }],
      input: "",
      phase: "running",
      status: "RUNNING",
    })
    const command = createTuiBackendCommand({
      backend,
      prompt,
      turn: state.hasSession ? "follow-up" : "first",
      model: options.model,
      yolo: options.yolo,
    })
    const result = await runBackendTurn(command)
    exitCode = result.status
    setState({
      ...state,
      entries: [...state.entries, ...outputEntries(result.output), backendEntry(result.status)],
      hasSession: result.status === 0 || state.hasSession,
      phase: "editing",
      status: result.status === 0 ? "READY" : "FAILED",
    })
  }

  stdin.setEncoding("utf8")
  stdin.setRawMode(true)
  stdin.resume()
  render(state, options)
  if (initial.input.trim()) void submit(initial.input)

  await new Promise<void>((resolve) => {
    stdin.on("data", (chunk: string) => {
      if (closed) return resolve()
      if (chunk === "\u0003") {
        close()
        return resolve()
      }
      if (state.phase === "running") return
      if ((chunk === "q" || chunk === "Q") && state.input.length === 0) {
        close()
        return resolve()
      }
      if (chunk === "\r" || chunk === "\n") {
        void submit(state.input)
        return
      }
      if (chunk === "\u007f") {
        setState({ ...state, input: state.input.slice(0, -1) })
        return
      }
      setState({ ...state, input: `${state.input}${chunk}` })
    })
  })
  return exitCode
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

function backendEntry(status: number): TuiEntry {
  if (status === 0) return { kind: "system", text: "Turn complete. Type a follow-up or press q to exit." }
  return { kind: "error", text: `Backend exited with status ${status}.` }
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

function render(state: State, options: TuiOptions) {
  process.stdout.write("\x1b[2J\x1b[H\x1b[?25l")
  process.stdout.write(
    renderOpenComposerFrame({
      ...state,
      model: options.model?.trim() || DEFAULT_COMPOSER_MODEL,
      width: process.stdout.columns || 100,
      yolo: options.yolo ?? false,
    }),
  )
}

function quoteShellSegment(segment: string) {
  if (/^[A-Za-z0-9_/:=.,@%+-]+$/.test(segment)) return segment
  return `'${segment.replaceAll("'", "'\"'\"'")}'`
}

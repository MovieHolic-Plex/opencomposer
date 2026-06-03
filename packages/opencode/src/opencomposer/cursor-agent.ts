export const DEFAULT_COMPOSER_MODEL = "composer-2.5"
export const DEFAULT_CURSOR_AGENT_BIN = "cursor-agent"

const HEADLESS_ARGS = ["--print", "--trust", "--force", "--output-format", "text"] as const

export type CursorAgentMode = "acp" | "headless" | "interactive"

export type CursorAgentArgsInput = {
  readonly mode: CursorAgentMode
  readonly model?: string
  readonly prompt?: string
  readonly yolo?: boolean
}

export type CursorAgentCommand = {
  readonly bin: string
  readonly args: readonly string[]
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string>>
}

export function buildCursorAgentArgs(input: CursorAgentArgsInput) {
  const model = input.model?.trim() || DEFAULT_COMPOSER_MODEL
  const yoloArgs = input.yolo ? ["--yolo", "--sandbox", "disabled", "--approve-mcps"] : []
  if (input.mode === "acp") return ["--model", model, ...yoloArgs, "acp"]
  if (input.mode === "interactive") return ["--model", model, ...yoloArgs, ...(input.prompt ? [input.prompt] : [])]
  return ["--model", model, ...yoloArgs, ...HEADLESS_ARGS, ...(input.prompt ? [input.prompt] : [])]
}

export function formatCursorAgentCommand(command: CursorAgentCommand) {
  return formatShellCommand(command)
}

export function formatShellCommand(command: CursorAgentCommand) {
  const env = Object.entries(command.env ?? {}).map(([key, value]) => `${key}=${quoteShellSegment(value)}`)
  const commandText = [...env, ...[command.bin, ...command.args].map(quoteShellSegment)].join(" ")
  if (!command.cwd) return commandText
  return `cd ${quoteShellSegment(command.cwd)} && ${commandText}`
}

function quoteShellSegment(segment: string) {
  if (/^[A-Za-z0-9_/:=.,@%+-]+$/.test(segment)) return segment
  return `'${segment.replaceAll("'", "'\"'\"'")}'`
}

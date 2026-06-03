export const DEFAULT_COMPOSER_MODEL = "composer-2.5"
export const DEFAULT_CURSOR_AGENT_BIN = "cursor-agent"

const HEADLESS_ARGS = ["--print", "--trust", "--force", "--output-format", "text"] as const

export type CursorAgentMode = "acp" | "headless"

export type CursorAgentArgsInput = {
  readonly mode: CursorAgentMode
  readonly model?: string
  readonly prompt?: string
}

export type CursorAgentCommand = {
  readonly bin: string
  readonly args: readonly string[]
}

export function buildCursorAgentArgs(input: CursorAgentArgsInput) {
  const model = input.model?.trim() || DEFAULT_COMPOSER_MODEL
  if (input.mode === "acp") return ["--model", model, "acp"]
  return ["--model", model, ...HEADLESS_ARGS, ...(input.prompt ? [input.prompt] : [])]
}

export function formatCursorAgentCommand(command: CursorAgentCommand) {
  return [command.bin, ...command.args].map(quoteShellSegment).join(" ")
}

function quoteShellSegment(segment: string) {
  if (/^[A-Za-z0-9_/:=.,@%+-]+$/.test(segment)) return segment
  return `'${segment.replaceAll("'", "'\"'\"'")}'`
}

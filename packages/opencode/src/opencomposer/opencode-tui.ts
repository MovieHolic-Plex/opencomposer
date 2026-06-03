import { fileURLToPath } from "node:url"
import type { CursorAgentCommand } from "./cursor-agent"

export type OpencodeTuiInput = {
  readonly model?: string
  readonly project?: string
  readonly prompt?: string
  readonly yolo?: boolean
}

export function buildOpencodeTuiCommand(input: OpencodeTuiInput): CursorAgentCommand {
  const target = fileURLToPath(new URL("../index.ts", import.meta.url))
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url))
  const project = input.project ?? process.cwd()
  const args = ["run", "--conditions=browser", target]
  if (input.model) args.push("--model", input.model)
  if (input.prompt) args.push("--prompt", input.prompt)
  args.push(project)
  return {
    bin: process.execPath,
    cwd: packageRoot,
    args,
    ...(input.yolo && { env: { OPENCODE_PERMISSION: JSON.stringify({ "*": "allow" }) } }),
  }
}

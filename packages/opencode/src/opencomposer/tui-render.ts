import { workflowStatusSummary, type DeepInterviewGate, type WorkflowState } from "./workflow"

export type TuiEntry = {
  readonly id?: string
  readonly kind: "agent" | "error" | "system" | "user"
  readonly text: string
}

export type TuiRenderInput = {
  readonly cwd: string
  readonly entries: readonly TuiEntry[]
  readonly hasSession: boolean
  readonly input: string
  readonly interview?: DeepInterviewGate
  readonly model: string
  readonly phase: "editing" | "interview" | "running"
  readonly status: string
  readonly width: number
  readonly workflow?: WorkflowState
  readonly yolo: boolean
}

const MIN_WIDTH = 72

export function renderOpenComposerFrame(input: TuiRenderInput) {
  const width = Math.max(input.width, MIN_WIDTH)
  const transcript = [
    headerLine(input, width),
    rule(width),
    ...sessionLines(input, width),
    blank(width),
    ...interviewLines(input, width),
    ...(input.phase === "interview" ? [blank(width)] : []),
    ...transcriptLines(input.entries, width),
    blank(width),
    composerLine(input, width),
    footerLine(input, width),
  ]
  return transcript.join("\n")
}

function headerLine(input: TuiRenderInput, width: number) {
  return fit(
    `OpenComposer  ${formatModel(input.model)}  ${input.yolo ? "YOLO" : "guarded"}  ${input.status}  ${workflowStatusSummary(input.workflow)}`,
    width,
  )
}

function sessionLines(input: TuiRenderInput, width: number) {
  return [
    fit("Session", width),
    fit(`  workspace  ${input.cwd}`, width),
    fit(`  backend    Cursor Composer headless${input.hasSession ? " / continued" : ""}`, width),
  ]
}

function interviewLines(input: TuiRenderInput, width: number) {
  if (input.phase !== "interview" || !input.interview) return []
  const question = input.interview.questions[input.interview.questionIndex] ?? "Confirm the request before continuing."
  return [
    fit(`Deep interview ${input.interview.questionIndex + 1}/${input.interview.questions.length}`, width),
    fit(`  ${question}`, width),
    fit("  answer required before ralplan, ultragoal, or execute", width),
  ]
}

function transcriptLines(entries: readonly TuiEntry[], width: number) {
  const visible = entries.length === 0 ? [{ kind: "system" as const, text: "ready" }] : entries.slice(-12)
  return [fit("Transcript", width), ...visible.flatMap((entry) => wrappedEntry(entry, width))]
}

function wrappedEntry(entry: TuiEntry, width: number) {
  const prefix = `${marker(entry.kind)} `
  return wrap(entry.text, width - prefix.length).map((line) => fit(prefix + line, width))
}

function composerLine(input: TuiRenderInput, width: number) {
  if (input.phase === "interview") return fit(`Deep interview  > ${input.input}`, width)
  const label = input.phase === "running" ? "running Composer backend..." : `> ${input.input}`
  return fit(`Composer  ${label}`, width)
}

function footerLine(input: TuiRenderInput, width: number) {
  return fit(`${input.cwd}    /status`, width)
}

function marker(kind: TuiEntry["kind"]) {
  if (kind === "agent") return "|"
  if (kind === "error") return "!"
  if (kind === "user") return ">"
  return "-"
}

function formatModel(model: string) {
  if (model === "composer-2.5") return "Composer 2.5"
  return model
}

function rule(width: number) {
  return "-".repeat(width)
}

function blank(width: number) {
  return " ".repeat(width)
}

function wrap(text: string, width: number) {
  const words = text.split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) return [""]
  return words.reduce<string[]>((lines, word) => {
    const last = lines.at(-1) ?? ""
    if (last.length === 0) return [word]
    if (last.length + word.length + 1 <= width) return [...lines.slice(0, -1), `${last} ${word}`]
    return [...lines, word]
  }, [])
}

function fit(text: string, width: number) {
  if (text.length <= width) return text.padEnd(width, " ")
  return text.slice(0, Math.max(width - 1, 0)) + "..."
}

export type TuiEntry = {
  readonly kind: "agent" | "error" | "system" | "user"
  readonly text: string
}

export type TuiRenderInput = {
  readonly cwd: string
  readonly entries: readonly TuiEntry[]
  readonly hasSession: boolean
  readonly input: string
  readonly model: string
  readonly phase: "editing" | "running"
  readonly status: string
  readonly width: number
  readonly yolo: boolean
}

const MIN_WIDTH = 72
const SIDEBAR_WIDTH = 36

export function renderOpenComposerFrame(input: TuiRenderInput) {
  const width = Math.max(input.width, MIN_WIDTH)
  const showSidebar = width >= 100
  const mainWidth = showSidebar ? width - SIDEBAR_WIDTH - 3 : width
  const transcript = [
    headerLine(input, mainWidth),
    rule(mainWidth),
    ...sessionLines(input, mainWidth),
    blank(mainWidth),
    ...transcriptLines(input.entries, mainWidth),
    blank(mainWidth),
    composerLine(input, mainWidth),
    footerLine(input, mainWidth),
  ]
  if (!showSidebar) return transcript.join("\n")
  return zipColumns(transcript, sidebarLines(input, SIDEBAR_WIDTH), mainWidth, " | ")
}

function headerLine(input: TuiRenderInput, width: number) {
  return fit(`OpenComposer  ${formatModel(input.model)}  ${input.yolo ? "YOLO" : "guarded"}  ${input.status}`, width)
}

function sessionLines(input: TuiRenderInput, width: number) {
  return [
    fit("Session", width),
    fit(`  workspace  ${input.cwd}`, width),
    fit(`  backend    Cursor Composer headless${input.hasSession ? " / continued" : ""}`, width),
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
  const label = input.phase === "running" ? "running Composer backend..." : `> ${input.input}`
  return fit(`Composer  ${label}`, width)
}

function footerLine(input: TuiRenderInput, width: number) {
  return fit(`${input.cwd}    /status`, width)
}

function sidebarLines(input: TuiRenderInput, width: number) {
  return [
    fit("OpenComposer", width),
    fit("Composer 2.5 for Cursor", width),
    rule(width),
    fit("Workflow", width),
    workflowItem("deep-interview", input.phase !== "editing", width),
    workflowItem("ralplan", input.phase !== "editing", width),
    workflowItem("ultragoal", input.phase !== "editing", width),
    workflowItem("team optional", false, width),
    blank(width),
    fit("Backend", width),
    fit(`  model  ${input.model}`, width),
    fit(`  mode   ${input.yolo ? "yolo" : "guarded"}`, width),
    fit(`  state  ${input.hasSession ? "continued" : "new session"}`, width),
  ]
}

function workflowItem(label: string, active: boolean, width: number) {
  return fit(`  ${active ? "[>]" : "[ ]"} ${label}`, width)
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

function zipColumns(left: readonly string[], right: readonly string[], leftWidth: number, gap: string) {
  return Array.from({ length: Math.max(left.length, right.length) }, (_, index) =>
    `${left[index] ?? blank(leftWidth)}${gap}${right[index] ?? ""}`.trimEnd(),
  ).join("\n")
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

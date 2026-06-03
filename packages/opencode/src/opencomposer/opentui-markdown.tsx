/** @jsxImportSource @opentui/solid */
import { For } from "solid-js"

const markdownColor = {
  accent: "#fab283",
  muted: "#808080",
  text: "#eeeeee",
  warning: "#f5a742",
} as const

export type MarkdownLine = {
  readonly kind: "blank" | "code" | "heading" | "list" | "paragraph" | "quote" | "table" | "tableHeader" | "tableRule"
  readonly spans: readonly MarkdownSpan[]
}

export type MarkdownSpan = {
  readonly kind: "code" | "normal" | "strong"
  readonly text: string
}

export function MarkdownText(props: { readonly muted?: boolean; readonly text: string }) {
  return (
    <box flexDirection="column">
      <For each={parseMarkdownLines(props.text)}>
        {(line) => (
          <text fg={lineColor(line, props.muted ?? false)} wrapMode={lineWrapMode(line)}>
            <For each={line.spans}>{(span) => <span style={spanStyle(line, span)}>{span.text}</span>}</For>
          </text>
        )}
      </For>
    </box>
  )
}

export function parseMarkdownLines(input: string): readonly MarkdownLine[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n")
  const parsed: MarkdownLine[] = []
  let inCodeBlock = false

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ""
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) {
      parsed.push({ kind: "code", spans: [{ kind: "code", text: `  ${line}` }] })
      continue
    }
    const maybeTable = parseTableBlock(lines, index)
    if (maybeTable) {
      parsed.push(...maybeTable.lines)
      index = maybeTable.nextIndex - 1
      continue
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      parsed.push({ kind: "heading", spans: parseInlineMarkdown(heading[2] ?? "") })
      continue
    }
    const list = /^(\s*)[-*+]\s+(.+)$/.exec(line)
    if (list) {
      parsed.push({ kind: "list", spans: [{ kind: "normal", text: "• " }, ...parseInlineMarkdown(list[2] ?? "")] })
      continue
    }
    const ordered = /^(\s*)\d+\.\s+(.+)$/.exec(line)
    if (ordered) {
      parsed.push({ kind: "list", spans: [{ kind: "normal", text: "• " }, ...parseInlineMarkdown(ordered[2] ?? "")] })
      continue
    }
    const quote = /^>\s?(.+)$/.exec(line)
    if (quote) {
      parsed.push({ kind: "quote", spans: parseInlineMarkdown(quote[1] ?? "") })
      continue
    }
    if (line.trim().length === 0) {
      parsed.push({ kind: "blank", spans: [{ kind: "normal", text: "" }] })
      continue
    }
    parsed.push({ kind: "paragraph", spans: parseInlineMarkdown(line) })
  }

  return parsed
}

function parseTableBlock(lines: readonly string[], startIndex: number) {
  const header = lines[startIndex]
  const separator = lines[startIndex + 1]
  if (!header || !separator || !isTableRow(header) || !isTableSeparator(separator)) return undefined

  const rows = [splitTableRow(header)]
  let nextIndex = startIndex + 2
  while (nextIndex < lines.length && isTableRow(lines[nextIndex] ?? "")) {
    rows.push(splitTableRow(lines[nextIndex] ?? ""))
    nextIndex++
  }

  const widths = columnWidths(rows)
  const tableLines: MarkdownLine[] = [
    { kind: "tableHeader", spans: [{ kind: "normal", text: formatTableRow(rows[0] ?? [], widths) }] },
    { kind: "tableRule", spans: [{ kind: "normal", text: formatTableRule(widths) }] },
    ...rows.slice(1).map((row) => ({
      kind: "table" as const,
      spans: [{ kind: "normal" as const, text: formatTableRow(row, widths) }],
    })),
  ]
  return { lines: tableLines, nextIndex }
}

function isTableRow(line: string) {
  return line.includes("|") && splitTableRow(line).length >= 2
}

function isTableSeparator(line: string) {
  const cells = splitTableRow(line)
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "")
  const cells: string[] = []
  let cell = ""
  let inCode = false
  let escaping = false
  for (const char of trimmed) {
    if (escaping) {
      cell += char
      escaping = false
      continue
    }
    if (char === "\\") {
      escaping = true
      continue
    }
    if (char === "`") inCode = !inCode
    if (char === "|" && !inCode) {
      cells.push(cell)
      cell = ""
      continue
    }
    cell += char
  }
  cells.push(cell)
  return cells.map((item) => stripInlineMarkdown(item.trim()))
}

function stripInlineMarkdown(input: string) {
  return parseInlineMarkdown(input)
    .map((span) => span.text)
    .join("")
}

function columnWidths(rows: readonly (readonly string[])[]) {
  const columnCount = Math.max(...rows.map((row) => row.length))
  return Array.from({ length: columnCount }, (_, index) => Math.max(...rows.map((row) => row[index]?.length ?? 0), 3))
}

function formatTableRow(row: readonly string[], widths: readonly number[]) {
  return widths.map((width, index) => (row[index] ?? "").padEnd(width, " ")).join("  ")
}

function formatTableRule(widths: readonly number[]) {
  return widths.map((width) => "-".repeat(width)).join("  ")
}

function parseInlineMarkdown(input: string): readonly MarkdownSpan[] {
  const spans: MarkdownSpan[] = []
  let index = 0
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g

  for (const match of input.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > index) spans.push({ kind: "normal", text: input.slice(index, start) })
    const token = match[0]
    if (token.startsWith("`")) {
      spans.push({ kind: "code", text: token.slice(1, -1) })
    } else {
      spans.push({ kind: "strong", text: token.slice(2, -2) })
    }
    index = start + token.length
  }

  if (index < input.length) spans.push({ kind: "normal", text: input.slice(index) })
  return spans
}

function lineColor(line: MarkdownLine, muted: boolean) {
  if (muted) return markdownColor.muted
  if (line.kind === "heading") return markdownColor.accent
  if (line.kind === "code") return markdownColor.warning
  if (line.kind === "quote") return markdownColor.muted
  if (line.kind === "tableHeader") return markdownColor.accent
  if (line.kind === "tableRule") return markdownColor.muted
  return markdownColor.text
}

function lineWrapMode(line: MarkdownLine) {
  if (line.kind === "code" || line.kind === "table" || line.kind === "tableHeader" || line.kind === "tableRule") {
    return "none"
  }
  return "word"
}

function spanStyle(line: MarkdownLine, span: MarkdownSpan) {
  if (span.kind === "code") return { fg: markdownColor.warning }
  if (span.kind === "strong" || line.kind === "heading" || line.kind === "tableHeader") return { bold: true }
  return {}
}

/** @jsxImportSource @opentui/solid */
import { For } from "solid-js"

const markdownColor = {
  accent: "#fab283",
  muted: "#808080",
  text: "#eeeeee",
  warning: "#f5a742",
} as const

export type MarkdownLine = {
  readonly kind: "blank" | "code" | "heading" | "list" | "paragraph" | "quote"
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
          <text fg={lineColor(line, props.muted ?? false)} wrapMode={line.kind === "code" ? "none" : "word"}>
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

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) {
      parsed.push({ kind: "code", spans: [{ kind: "code", text: `  ${line}` }] })
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
  return markdownColor.text
}

function spanStyle(line: MarkdownLine, span: MarkdownSpan) {
  if (span.kind === "code") return { fg: markdownColor.warning }
  if (span.kind === "strong" || line.kind === "heading") return { bold: true }
  return {}
}

import { describe, expect, test } from "bun:test"
import { readCursorStreamJson } from "@/opencomposer/cursor-stream"
import { parseMarkdownLines } from "@/opencomposer/opentui-markdown"
import type { TuiEntry } from "@/opencomposer/tui-render"

describe("opencomposer cursor stream", () => {
  test("Given stream-json assistant events When reading output Then live entries are replaced by id", async () => {
    const entries: TuiEntry[] = []
    const output = await readCursorStreamJson({
      onEntry: (entry) => {
        entries.push(entry)
      },
      stage: "execute",
      stream: streamFromLines([
        { type: "assistant", message: { content: [{ type: "text", text: "# Result\n" }] } },
        { type: "assistant", message: { content: [{ type: "text", text: "Done with `tests`." }] } },
        { type: "result", result: "# Result\nDone with `tests`." },
      ]),
    })

    expect(output).toBe("# Result\nDone with `tests`.")
    expect(entries.at(-1)).toEqual({
      id: "cursor-stream-execute",
      kind: "agent",
      text: "# Result\nDone with `tests`.",
    })
  })

  test("Given cumulative stream-json assistant events When reading output Then repeated prefixes are not duplicated", async () => {
    const entries: TuiEntry[] = []
    const output = await readCursorStreamJson({
      onEntry: (entry) => {
        entries.push(entry)
      },
      stage: "execute",
      stream: streamFromLines([
        { type: "assistant", message: { content: [{ type: "text", text: "Checking" }] } },
        { type: "assistant", message: { content: [{ type: "text", text: "Checking files" }] } },
        { type: "assistant", message: { content: [{ type: "text", text: "Checking files now" }] } },
        { type: "result", result: "Checking files now" },
      ]),
    })

    expect(output).toBe("Checking files now")
    expect(entries.at(-1)?.text).toBe("Checking files now")
  })

  test("Given repeated tool events When reading output Then identical progress summaries are emitted once", async () => {
    const entries: TuiEntry[] = []
    await readCursorStreamJson({
      onEntry: (entry) => {
        entries.push(entry)
      },
      stage: "execute",
      stream: streamFromLines([
        {
          type: "tool_call",
          subtype: "started",
          tool_call: { readToolCall: { args: { path: "README.md" } } },
        },
        {
          type: "tool_call",
          subtype: "started",
          tool_call: { readToolCall: { args: { path: "README.md" } } },
        },
      ]),
    })

    expect(entries).toEqual([{ kind: "system", text: "execute: tool read started README.md" }])
  })

  test("Given markdown text When parsing it Then common blocks lose raw markdown markers", () => {
    const lines = parseMarkdownLines(["# Title", "- item with **bold**", "```", "const ok = true", "```"].join("\n"))

    expect(lines.map((line) => line.kind)).toEqual(["heading", "list", "code"])
    expect(lines[0]?.spans.map((span) => span.text).join("")).toBe("Title")
    expect(lines[1]?.spans.map((span) => span.text).join("")).toBe("• item with bold")
    expect(lines[2]?.spans.map((span) => span.text).join("")).toBe("  const ok = true")
  })
})

function streamFromLines(lines: readonly Record<string, unknown>[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      for (const line of lines) controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
      controller.close()
    },
  })
}

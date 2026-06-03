import type { WorkflowProgress, WorkflowStageId } from "./workflow"

type CursorStreamInput = {
  readonly onEntry?: WorkflowProgress
  readonly stage: WorkflowStageId
  readonly stream: ReadableStream<Uint8Array>
}

type StreamState = {
  assistantText: string
  emittedTextLength: number
  resultText: string
}

export async function readCursorStreamJson(input: CursorStreamInput) {
  const decoder = new TextDecoder()
  const reader = input.stream.getReader()
  const state: StreamState = { assistantText: "", emittedTextLength: 0, resultText: "" }
  let rawText = ""
  let buffer = ""

  for (;;) {
    const chunk = await reader.read()
    if (chunk.done) break
    const text = decoder.decode(chunk.value, { stream: true })
    rawText += text
    buffer += text
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ""
    for (const line of lines) handleCursorStreamLine(line, input, state)
  }

  const tail = `${buffer}${decoder.decode()}`
  if (tail.trim().length > 0) handleCursorStreamLine(tail, input, state)
  emitAssistantEntry(input, state, true)
  return state.resultText || state.assistantText || rawText.trimEnd()
}

function handleCursorStreamLine(line: string, input: CursorStreamInput, state: StreamState) {
  const trimmed = line.trim()
  if (!trimmed) return
  const event = parseJsonObject(trimmed)
  if (!event) {
    appendAssistantText(input, state, line)
    return
  }
  const type = stringField(event, "type")
  if (type === "result") {
    state.resultText = stringField(event, "result") ?? state.assistantText
    if (!state.assistantText && state.resultText) appendAssistantText(input, state, state.resultText)
    return
  }
  if (type === "assistant") {
    for (const text of extractAssistantTexts(event)) appendAssistantText(input, state, text)
    return
  }
  const summary = summarizeCursorEvent(event)
  if (summary) input.onEntry?.({ kind: "system", text: `${input.stage}: ${summary}` })
}

function appendAssistantText(input: CursorStreamInput, state: StreamState, text: string) {
  if (text.length === 0) return
  state.assistantText += text
  emitAssistantEntry(input, state, text.includes("\n"))
}

function emitAssistantEntry(input: CursorStreamInput, state: StreamState, force: boolean) {
  if (!state.assistantText) return
  if (!force && state.assistantText.length - state.emittedTextLength < 32) return
  state.emittedTextLength = state.assistantText.length
  input.onEntry?.({
    id: `cursor-stream-${input.stage}`,
    kind: "agent",
    text: state.assistantText.trimEnd(),
  })
}

function summarizeCursorEvent(event: Record<string, unknown>) {
  const type = stringField(event, "type")
  if (!type || type === "user" || type === "system") return undefined
  const subtype = stringField(event, "subtype")
  const name = stringField(event, "name") ?? stringField(event, "tool_name")
  return [type, subtype, name].filter(Boolean).join(" ")
}

function extractAssistantTexts(event: Record<string, unknown>) {
  const direct = stringField(event, "text") ?? stringField(event, "delta")
  if (direct) return [direct]
  const message = objectField(event, "message")
  if (!message) return []
  const content = arrayField(message, "content")
  if (!content) return []
  return content.flatMap((item) => {
    if (!isRecord(item)) return []
    const text = stringField(item, "text")
    return text ? [text] : []
  })
}

function parseJsonObject(input: string) {
  try {
    const value: unknown = JSON.parse(input)
    return isRecord(value) ? value : undefined
  } catch {
    return undefined
  }
}

function stringField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return typeof value === "string" ? value : undefined
}

function objectField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return isRecord(value) ? value : undefined
}

function arrayField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return Array.isArray(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** @jsxImportSource @opentui/solid */
import { createCliRenderer } from "@opentui/core"
import { render, useKeyboard } from "@opentui/solid"
import { createSignal, onMount } from "solid-js"
import { DEFAULT_COMPOSER_MODEL } from "./cursor-agent"
import { isBackspaceKey, isSubmitKey, printableKey } from "./keyboard"
import { color, Composer, Footer, Header, SessionPanel, Transcript } from "./opentui-view"
import type { TuiEntry } from "./tui-render"
import {
  answerDeepInterviewGate,
  createDeepInterviewGate,
  workflowCompletionEntry,
  type DeepInterviewGate,
  type WorkflowState,
} from "./workflow"

export type OpenTuiState = {
  readonly cwd: string
  readonly entries: readonly TuiEntry[]
  readonly hasSession: boolean
  readonly input: string
  readonly interview?: DeepInterviewGate
  readonly phase: "editing" | "interview" | "running"
  readonly status: string
  readonly workflow?: WorkflowState
}

export type OpenTuiBackend = (input: {
  readonly onEntry?: (entry: TuiEntry) => void
  readonly onWorkflowUpdate?: (workflow: WorkflowState) => void
  readonly prompt: string
  readonly turn: "first" | "follow-up"
}) => Promise<{ readonly entries: readonly TuiEntry[]; readonly status: number; readonly workflow?: WorkflowState }>

export type OpenTuiOptions = {
  readonly backend: OpenTuiBackend
  readonly initial: OpenTuiState
  readonly model?: string
  readonly yolo?: boolean
}

export async function runOpenComposerOpenTui(options: OpenTuiOptions) {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    targetFps: 60,
    useKittyKeyboard: {},
    useMouse: true,
  })
  let status = 0
  const done = new Promise<number>((resolve) => {
    const close = (next: number) => {
      status = next
      if (!renderer.isDestroyed) renderer.destroy()
      resolve(status)
    }
    void render(() => <OpenComposerApp {...options} close={close} />, renderer)
  })
  return await done
}

function OpenComposerApp(props: OpenTuiOptions & { readonly close: (status: number) => void }) {
  const model = props.model?.trim() || DEFAULT_COMPOSER_MODEL
  const [state, setState] = createSignal(props.initial)
  const [exitStatus, setExitStatus] = createSignal(0)

  const submit = (value = state().input) => {
    const current = state()
    if (current.phase === "interview") {
      submitInterviewAnswer(current, value)
      return
    }
    const prompt = value.trim()
    if (!prompt || current.phase === "running") return
    const entries = [...current.entries, { kind: "user" as const, text: prompt }]
    const interview = createDeepInterviewGate(prompt)
    if (interview) {
      setState({
        ...current,
        entries: [...entries, interviewQuestionEntry(interview)],
        input: "",
        interview,
        phase: "interview",
        status: "INTERVIEW",
      })
      return
    }
    runBackend(prompt, current, entries)
  }

  const submitInterviewAnswer = (current: OpenTuiState, value: string) => {
    const answer = value.trim()
    if (!answer || !current.interview) return
    const result = answerDeepInterviewGate(current.interview, answer)
    const entries = [...current.entries, { kind: "user" as const, text: answer }]
    if (result.kind === "next") {
      setState({
        ...current,
        entries: [...entries, interviewQuestionEntry(result.gate)],
        input: "",
        interview: result.gate,
      })
      return
    }
    const summary =
      result.kind === "skip"
        ? "deep-interview explicitly skipped; continuing workflow."
        : "deep-interview answers captured; starting workflow."
    runBackend(result.prompt, current, [...entries, { kind: "system", text: summary }])
  }

  const runBackend = (prompt: string, current: OpenTuiState, entries: readonly TuiEntry[]) => {
    setState({
      ...current,
      entries,
      input: "",
      interview: undefined,
      phase: "running",
      status: "RUNNING",
    })
    void props
      .backend({
        onEntry: (entry) => {
          setState((next) => ({ ...next, entries: upsertEntry(next.entries, entry) }))
        },
        onWorkflowUpdate: (workflow) => {
          setState((next) => ({ ...next, workflow }))
        },
        prompt,
        turn: current.hasSession ? "follow-up" : "first",
      })
      .then((result) => {
        setExitStatus(result.status)
        setState((next) => ({
          ...next,
          entries: [
            ...next.entries,
            ...result.entries,
            ...completionEntries(result.status, result.workflow),
            backendEntry(result.status),
          ],
          hasSession: result.status === 0 || next.hasSession,
          phase: "editing",
          status: result.status === 0 ? "READY" : "FAILED",
          workflow: result.workflow ?? next.workflow,
        }))
      })
      .catch((error: unknown) => {
        setExitStatus(1)
        setState((next) => ({
          ...next,
          entries: [...next.entries, { kind: "error", text: error instanceof Error ? error.message : String(error) }],
          phase: "editing",
          status: "FAILED",
        }))
      })
  }

  useKeyboard((event) => {
    if (event.ctrl && event.name === "c") {
      event.preventDefault()
      props.close(exitStatus())
      return
    }
    if (state().phase === "running") return
    if ((event.name === "q" || event.raw === "q") && state().input.length === 0) {
      props.close(exitStatus())
      return
    }
    if (isSubmitKey(event)) {
      event.preventDefault()
      submit()
      return
    }
    if (isBackspaceKey(event)) {
      setState((next) => ({ ...next, input: next.input.slice(0, -1) }))
      return
    }
    const nextCharacter = printableKey(event)
    if (nextCharacter) {
      setState((next) => ({ ...next, input: `${next.input}${nextCharacter}` }))
    }
  })

  onMount(() => {
    if (props.initial.input.trim()) submit(props.initial.input)
  })

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={color.background}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
    >
      <Header model={model} status={state().status} workflow={state().workflow} yolo={props.yolo ?? false} />
      <SessionPanel state={state()} />
      <DeepInterviewPanel interview={state().interview} />
      <Transcript entries={state().entries} />
      <Composer input={state().input} phase={state().phase} />
      <Footer cwd={state().cwd} />
    </box>
  )
}

function DeepInterviewPanel(props: { readonly interview?: DeepInterviewGate }) {
  const interview = props.interview
  if (!interview) return null
  const question = interview.questions[interview.questionIndex] ?? "Confirm the request before continuing."
  return (
    <box
      border
      borderColor={color.accent}
      flexDirection="column"
      marginBottom={1}
      paddingLeft={1}
      paddingRight={1}
      flexShrink={0}
    >
      <text fg={color.accent}>
        <b>Deep interview</b> {interview.questionIndex + 1}/{interview.questions.length}
      </text>
      <text fg={color.text}>{question}</text>
      <text fg={color.muted}>Answer to continue. Type /skip deep interview only to bypass this gate.</text>
    </box>
  )
}

function interviewQuestionEntry(interview: DeepInterviewGate): TuiEntry {
  const question = interview.questions[interview.questionIndex] ?? "Confirm the request before continuing."
  return {
    kind: "system",
    text: [
      "## Deep interview",
      `${interview.questionIndex + 1}/${interview.questions.length}. ${question}`,
      "Answer before ralplan, ultragoal, or execute can start.",
    ].join("\n"),
  }
}

function backendEntry(status: number): TuiEntry {
  if (status === 0) return { kind: "system", text: "Turn complete. Type a follow-up or press q to exit." }
  return { kind: "error", text: `Backend exited with status ${status}.` }
}

function completionEntries(status: number, workflow: WorkflowState | undefined): readonly TuiEntry[] {
  if (status !== 0 || !workflow) return []
  const entry = workflowCompletionEntry(workflow)
  return entry ? [entry] : []
}

function upsertEntry(entries: readonly TuiEntry[], entry: TuiEntry): readonly TuiEntry[] {
  if (!entry.id) return [...entries, entry]
  const index = entries.findIndex((item) => item.id === entry.id)
  if (index < 0) return [...entries, entry]
  return [...entries.slice(0, index), entry, ...entries.slice(index + 1)]
}

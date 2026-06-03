/** @jsxImportSource @opentui/solid */
import { createCliRenderer } from "@opentui/core"
import { render, useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { createMemo, createSignal, onMount, Show } from "solid-js"
import { DEFAULT_COMPOSER_MODEL } from "./cursor-agent"
import { color, Composer, Footer, Header, SessionPanel, Sidebar, Transcript } from "./opentui-view"
import type { TuiEntry } from "./tui-render"

export type OpenTuiState = {
  readonly cwd: string
  readonly entries: readonly TuiEntry[]
  readonly hasSession: boolean
  readonly input: string
  readonly phase: "editing" | "running"
  readonly status: string
}

export type OpenTuiBackend = (input: {
  readonly prompt: string
  readonly turn: "first" | "follow-up"
}) => Promise<{ readonly entries: readonly TuiEntry[]; readonly status: number }>

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
  const dimensions = useTerminalDimensions()
  const model = props.model?.trim() || DEFAULT_COMPOSER_MODEL
  const [state, setState] = createSignal(props.initial)
  const [exitStatus, setExitStatus] = createSignal(0)
  const wide = createMemo(() => dimensions().width >= 110)
  const contentWidth = createMemo(() => (wide() ? dimensions().width - 42 : dimensions().width))

  const submit = (value = state().input) => {
    const prompt = value.trim()
    if (!prompt || state().phase === "running") return
    const current = state()
    setState({
      ...current,
      entries: [...current.entries, { kind: "user", text: prompt }],
      input: "",
      phase: "running",
      status: "RUNNING",
    })
    void props
      .backend({ prompt, turn: current.hasSession ? "follow-up" : "first" })
      .then((result) => {
        setExitStatus(result.status)
        setState((next) => ({
          ...next,
          entries: [...next.entries, ...result.entries, backendEntry(result.status)],
          hasSession: result.status === 0 || next.hasSession,
          phase: "editing",
          status: result.status === 0 ? "READY" : "FAILED",
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
    if (event.name === "enter") {
      event.preventDefault()
      submit()
      return
    }
    if (event.name === "backspace") {
      setState((next) => ({ ...next, input: next.input.slice(0, -1) }))
      return
    }
    if (event.raw.length === 1 && !event.ctrl && !event.meta) {
      setState((next) => ({ ...next, input: `${next.input}${event.raw}` }))
    }
  })

  onMount(() => {
    if (props.initial.input.trim()) submit(props.initial.input)
  })

  return (
    <box width="100%" height="100%" flexDirection="row" backgroundColor={color.background}>
      <box width={contentWidth()} height="100%" flexDirection="column" paddingLeft={2} paddingRight={2} paddingTop={1}>
        <Header model={model} status={state().status} yolo={props.yolo ?? false} />
        <SessionPanel state={state()} />
        <Transcript entries={state().entries} />
        <Composer input={state().input} phase={state().phase} />
        <Footer cwd={state().cwd} />
      </box>
      <Show when={wide()}>
        <Sidebar model={model} state={state()} yolo={props.yolo ?? false} />
      </Show>
    </box>
  )
}

function backendEntry(status: number): TuiEntry {
  if (status === 0) return { kind: "system", text: "Turn complete. Type a follow-up or press q to exit." }
  return { kind: "error", text: `Backend exited with status ${status}.` }
}

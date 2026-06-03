/** @jsxImportSource @opentui/solid */
import "opentui-spinner/solid"
import { For, Show } from "solid-js"
import type { OpenTuiState } from "./opentui"
import type { TuiEntry } from "./tui-render"

export const color = {
  accent: "#fab283",
  background: "#0a0a0a",
  panel: "#141414",
  border: "#484848",
  borderActive: "#606060",
  error: "#e06c75",
  muted: "#808080",
  success: "#7fd88f",
  text: "#eeeeee",
  warning: "#f5a742",
} as const

export function Header(props: { readonly model: string; readonly status: string; readonly yolo: boolean }) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      border
      borderColor={color.border}
      paddingLeft={1}
      paddingRight={1}
    >
      <text fg={color.text}>
        <span style={{ fg: color.accent }}>●</span> <b>Open</b>Composer
      </text>
      <text fg={color.muted}>
        {props.model} · {props.yolo ? "YOLO" : "guarded"} · {props.status}
      </text>
    </box>
  )
}

export function SessionPanel(props: { readonly state: OpenTuiState }) {
  return (
    <box flexDirection="column" paddingTop={1} paddingBottom={1} flexShrink={0}>
      <Row>
        <text fg={color.text}>
          <b>Session</b>
        </text>
      </Row>
      <Row>
        <text fg={color.muted} wrapMode="none">
          workspace {props.state.cwd}
        </text>
      </Row>
      <Row>
        <text fg={color.muted} wrapMode="none">
          backend Cursor Composer headless{props.state.hasSession ? " / continued" : ""}
        </text>
      </Row>
    </box>
  )
}

export function Transcript(props: { readonly entries: readonly TuiEntry[] }) {
  return (
    <scrollbox flexGrow={1} minHeight={0} border borderColor={color.border} padding={1}>
      <box flexDirection="column" gap={1}>
        <For each={props.entries.slice(-40)}>{(entry) => <TranscriptEntry entry={entry} />}</For>
      </box>
    </scrollbox>
  )
}

function TranscriptEntry(props: { readonly entry: TuiEntry }) {
  return (
    <box flexDirection="row" gap={1}>
      <text fg={entryColor(props.entry.kind)}>{marker(props.entry.kind)}</text>
      <text fg={props.entry.kind === "system" ? color.muted : color.text} wrapMode="word">
        {props.entry.text}
      </text>
    </box>
  )
}

export function Composer(props: { readonly input: string; readonly phase: OpenTuiState["phase"] }) {
  return (
    <box border borderColor={color.borderActive} paddingLeft={1} paddingRight={1} marginTop={1} flexShrink={0}>
      <Show when={props.phase === "running"} fallback={<text fg={color.text}>› {props.input}</text>}>
        <box flexDirection="row" gap={1}>
          <spinner frames={["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]} interval={80} color={color.accent} />
          <text fg={color.muted}>running Composer backend...</text>
        </box>
      </Show>
    </box>
  )
}

export function Sidebar(props: { readonly model: string; readonly state: OpenTuiState; readonly yolo: boolean }) {
  return (
    <box
      width={42}
      height="100%"
      flexDirection="column"
      backgroundColor={color.panel}
      paddingTop={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <Row>
        <text fg={color.text}>
          <b>Workflow</b>
        </text>
      </Row>
      <WorkflowItem label="deep-interview" active={props.state.phase === "running"} />
      <WorkflowItem label="ralplan" active={props.state.phase === "running"} />
      <WorkflowItem label="ultragoal" active={props.state.phase === "running"} />
      <WorkflowItem label="team optional" active={false} />
      <box height={1} />
      <Row>
        <text fg={color.text}>
          <b>Backend</b>
        </text>
      </Row>
      <Row>
        <text fg={color.muted}>model {props.model}</text>
      </Row>
      <Row>
        <text fg={color.muted}>mode {props.yolo ? "yolo" : "guarded"}</text>
      </Row>
      <Row>
        <text fg={color.muted}>state {props.state.hasSession ? "continued" : "new session"}</text>
      </Row>
    </box>
  )
}

function WorkflowItem(props: { readonly active: boolean; readonly label: string }) {
  return (
    <Row>
      <text fg={props.active ? color.success : color.muted}>
        {props.active ? "●" : "○"} {props.label}
      </text>
    </Row>
  )
}

function Row(props: { readonly children: unknown }) {
  return (
    <box height={1} flexShrink={0}>
      {props.children}
    </box>
  )
}

export function Footer(props: { readonly cwd: string }) {
  return (
    <box flexDirection="row" justifyContent="space-between" paddingTop={1} flexShrink={0}>
      <text fg={color.muted}>{props.cwd}</text>
      <text fg={color.muted}>q exit · enter send</text>
    </box>
  )
}

function marker(kind: TuiEntry["kind"]) {
  if (kind === "agent") return "│"
  if (kind === "error") return "!"
  if (kind === "user") return ">"
  return "-"
}

function entryColor(kind: TuiEntry["kind"]) {
  if (kind === "error") return color.error
  if (kind === "user") return color.accent
  if (kind === "agent") return color.success
  return color.muted
}

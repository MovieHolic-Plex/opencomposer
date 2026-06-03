import { describe, expect, test } from "bun:test"
import {
  createOpenComposerTuiDryRun,
  createTuiBackendCommand,
  isSubmitKey,
  selectOpenComposerTuiRunner,
} from "@/opencomposer/tui"
import { renderOpenComposerFrame } from "@/opencomposer/tui-render"

describe("opencomposer tui", () => {
  test("Given default options When formatting dry-run Then it names opencomposer instead of Cursor Agent", () => {
    expect(createOpenComposerTuiDryRun({ backend: "cursor-agent" })).toBe(
      "opencomposer-tui --backend cursor-agent --model composer-2.5",
    )
  })

  test("Given yolo and prompt When formatting dry-run Then both are visible", () => {
    expect(createOpenComposerTuiDryRun({ backend: "cursor-agent", prompt: "fix tests", yolo: true })).toBe(
      "opencomposer-tui --backend cursor-agent --model composer-2.5 --yolo --prompt 'fix tests'",
    )
  })

  test("Given first turn When building backend command Then Cursor Agent runs headless Composer", () => {
    const command = createTuiBackendCommand({
      backend: "cursor-agent",
      prompt: "fix tests",
      turn: "first",
      yolo: true,
    })

    expect(command).toEqual({
      bin: "cursor-agent",
      args: [
        "--model",
        "composer-2.5",
        "--yolo",
        "--sandbox",
        "disabled",
        "--approve-mcps",
        "--print",
        "--trust",
        "--force",
        "--output-format",
        "text",
        "fix tests",
      ],
    })
  })

  test("Given follow-up turn When building backend command Then Cursor Agent continues the prior session", () => {
    const command = createTuiBackendCommand({
      backend: "cursor-agent",
      prompt: "continue",
      turn: "follow-up",
    })

    expect(command.args).toContain("--continue")
  })

  test("Given a TUI state When rendering Then it uses an opencode-style session surface", () => {
    const frame = renderOpenComposerFrame({
      cwd: "/workspace/app",
      entries: [
        { kind: "system", text: "opencomposer ready." },
        { kind: "user", text: "fix tests" },
        { kind: "agent", text: "Checking failures." },
      ],
      hasSession: true,
      input: "next task",
      model: "composer-2.5",
      phase: "editing",
      status: "READY",
      width: 120,
      yolo: false,
    })

    expect(frame).toContain("OpenComposer")
    expect(frame).toContain("Session")
    expect(frame).toContain("Workflow")
    expect(frame).toContain("Composer 2.5")
    expect(frame).toContain("/workspace/app")
    expect(frame).not.toContain("Cursor Agent")
  })

  test("Given an interactive terminal When selecting a runner Then OpenTUI is the default surface", () => {
    expect(selectOpenComposerTuiRunner({ stdinTty: true, stdoutTty: true })).toBe("opentui")
  })

  test("Given a non-interactive prompt When selecting a runner Then it uses direct backend output", () => {
    expect(selectOpenComposerTuiRunner({ prompt: "fix tests", stdinTty: false, stdoutTty: true })).toBe("headless")
  })

  test("Given OpenTUI return and linefeed events When handling keyboard input Then both submit the prompt", () => {
    expect(isSubmitKey({ name: "return", raw: "\r" })).toBe(true)
    expect(isSubmitKey({ name: "linefeed", raw: "\n" })).toBe(true)
    expect(isSubmitKey({ name: "enter", raw: "\r" })).toBe(true)
  })
})

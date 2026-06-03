import { describe, expect, test } from "bun:test"
import { createOpenComposerTuiDryRun, createTuiBackendCommand } from "@/opencomposer/tui"

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
})

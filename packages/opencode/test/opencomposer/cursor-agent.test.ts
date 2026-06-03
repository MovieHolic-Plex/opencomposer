import { describe, expect, test } from "bun:test"
import { DEFAULT_COMPOSER_MODEL, buildCursorAgentArgs, formatCursorAgentCommand } from "@/opencomposer/cursor-agent"

describe("opencomposer cursor agent bridge", () => {
  test("Given an ACP launch When no model is provided Then composer-2.5 is selected", () => {
    const args = buildCursorAgentArgs({ mode: "acp" })

    expect(DEFAULT_COMPOSER_MODEL).toBe("composer-2.5")
    expect(args).toEqual(["--model", "composer-2.5", "acp"])
  })

  test("Given a headless prompt When no model is provided Then Cursor Agent receives composer-2.5", () => {
    const args = buildCursorAgentArgs({ mode: "headless", prompt: "fix tests" })

    expect(args).toEqual([
      "--model",
      "composer-2.5",
      "--print",
      "--trust",
      "--force",
      "--output-format",
      "text",
      "fix tests",
    ])
  })

  test("Given an explicit model When building commands Then the override is preserved", () => {
    const args = buildCursorAgentArgs({
      mode: "acp",
      model: "composer-2.5-fast",
    })

    expect(args).toEqual(["--model", "composer-2.5-fast", "acp"])
  })

  test("Given arguments with spaces When formatting a dry run Then shell quoting is stable", () => {
    const formatted = formatCursorAgentCommand({
      bin: "cursor-agent",
      args: buildCursorAgentArgs({ mode: "headless", prompt: "fix failing tests" }),
    })

    expect(formatted).toBe(
      "cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix failing tests'",
    )
  })
})

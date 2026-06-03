import { describe, expect, test } from "bun:test"
import { buildOpencodeTuiCommand } from "@/opencomposer/opencode-tui"

describe("opencomposer opencode tui launcher", () => {
  test("Given no arguments When building an OpenCode TUI command Then it starts from the package root", () => {
    const command = buildOpencodeTuiCommand({})

    expect(command.bin).toBe(process.execPath)
    expect(command.cwd).toEndWith("/packages/opencode/")
    expect(command.args.slice(0, 3)).toEqual(["run", "--conditions=browser", expect.stringContaining("src/index.ts")])
    expect(command.args.slice(3)).toEqual([process.cwd()])
    expect(command.env).toBeUndefined()
  })

  test("Given yolo mode When building a TUI command Then permission override is scoped to the child process", () => {
    const command = buildOpencodeTuiCommand({
      prompt: "fix tests",
      yolo: true,
    })

    expect(command.args).toContain("--prompt")
    expect(command.args).toContain("fix tests")
    expect(command.env).toEqual({
      OPENCODE_PERMISSION: JSON.stringify({ "*": "allow" }),
    })
  })
})

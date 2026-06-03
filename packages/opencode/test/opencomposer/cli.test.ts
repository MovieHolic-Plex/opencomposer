import { describe, expect, test } from "bun:test"

describe("opencomposer cli", () => {
  test("Given a dry-run prompt When running the source CLI Then it prints a composer-2.5 Cursor Agent command", async () => {
    const proc = Bun.spawn([process.execPath, "src/opencomposer/cli.ts", "--dry-run", "fix tests"], {
      cwd: import.meta.dir.replace("/test/opencomposer", ""),
      stdout: "pipe",
      stderr: "pipe",
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toBe(
      "cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'",
    )
  })

  test("Given an ACP dry run When a model override is passed Then the override is preserved", async () => {
    const proc = Bun.spawn(
      [process.execPath, "src/opencomposer/cli.ts", "--dry-run", "--acp", "--model", "composer-2.5-fast"],
      {
        cwd: import.meta.dir.replace("/test/opencomposer", ""),
        stdout: "pipe",
        stderr: "pipe",
      },
    )

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toBe("cursor-agent --model composer-2.5-fast acp")
  })
})

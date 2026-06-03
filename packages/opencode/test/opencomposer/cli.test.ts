import { describe, expect, test } from "bun:test"

describe("opencomposer cli", () => {
  test("Given no command mode When running the source CLI dry-run Then it prints the opencomposer TUI launcher", async () => {
    const proc = Bun.spawn([process.execPath, "src/opencomposer/cli.ts", "--dry-run"], {
      cwd: import.meta.dir.replace("/test/opencomposer", ""),
      stdout: "pipe",
      stderr: "pipe",
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toBe("opencomposer-tui --backend cursor-agent --model composer-2.5")
  })

  test("Given a prompt When running the source CLI dry-run Then it opens opencomposer TUI with an initial prompt", async () => {
    const proc = Bun.spawn([process.execPath, "src/opencomposer/cli.ts", "--dry-run", "fix tests"], {
      cwd: import.meta.dir.replace("/test/opencomposer", ""),
      stdout: "pipe",
      stderr: "pipe",
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toBe("opencomposer-tui --backend cursor-agent --model composer-2.5 --prompt 'fix tests'")
  })

  test("Given opencode TUI mode When running dry-run Then it opens the upstream TUI shell", async () => {
    const proc = Bun.spawn([process.execPath, "src/opencomposer/cli.ts", "--dry-run", "--opencode-tui"], {
      cwd: import.meta.dir.replace("/test/opencomposer", ""),
      stdout: "pipe",
      stderr: "pipe",
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toContain("bun run --conditions=browser")
    expect(stdout.trim()).toContain("src/index.ts")
  })

  test("Given headless mode When running the source CLI Then it prints a Cursor Agent command", async () => {
    const proc = Bun.spawn([process.execPath, "src/opencomposer/cli.ts", "--dry-run", "--headless", "fix tests"], {
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

  test("Given yolo mode When running TUI dry-run Then it prints opencomposer yolo TUI launcher", async () => {
    const proc = Bun.spawn([process.execPath, "src/opencomposer/cli.ts", "--dry-run", "--yolo", "fix tests"], {
      cwd: import.meta.dir.replace("/test/opencomposer", ""),
      stdout: "pipe",
      stderr: "pipe",
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    expect(await proc.exited).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toBe(
      "opencomposer-tui --backend cursor-agent --model composer-2.5 --yolo --prompt 'fix tests'",
    )
  })
})

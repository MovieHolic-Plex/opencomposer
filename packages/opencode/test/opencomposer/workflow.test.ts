import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  createInitialWorkflow,
  runWorkflowTurn,
  writeWorkflowState,
  type WorkflowBackend,
} from "@/opencomposer/workflow"

describe("opencomposer workflow", () => {
  test("Given a new task When creating workflow state Then all stages start pending", () => {
    const workflow = createInitialWorkflow({ prompt: "fix tests" })

    expect(workflow.stages.map((stage) => `${stage.id}:${stage.status}`)).toEqual([
      "deep-interview:pending",
      "ralplan:pending",
      "ultragoal:pending",
      "team:skipped",
      "execute:pending",
    ])
  })

  test("Given a workflow backend When running a turn Then it gates execution through every stage", async () => {
    const calls: string[] = []
    const backend: WorkflowBackend = async (input) => {
      calls.push(`${input.stage}:${input.prompt}`)
      return { output: `artifact from ${input.stage}`, status: 0 }
    }

    const result = await runWorkflowTurn({
      backend,
      prompt: "fix tests",
      turn: "first",
    })

    expect(result.status).toBe(0)
    expect(calls.map((call) => call.split(":")[0])).toEqual(["deep-interview", "ralplan", "ultragoal", "execute"])
    expect(calls.at(-1)).toContain("artifact from deep-interview")
    expect(calls.at(-1)).toContain("artifact from ralplan")
    expect(calls.at(-1)).toContain("artifact from ultragoal")
    expect(result.workflow.stages.map((stage) => `${stage.id}:${stage.status}`)).toEqual([
      "deep-interview:done",
      "ralplan:done",
      "ultragoal:done",
      "team:skipped",
      "execute:done",
    ])
  })

  test("Given team execution is enabled When running a turn Then the optional team stage runs before execute", async () => {
    const calls: string[] = []
    const backend: WorkflowBackend = async (input) => {
      calls.push(input.stage)
      return { output: `artifact from ${input.stage}`, status: 0 }
    }

    const result = await runWorkflowTurn({
      backend,
      prompt: "fix tests",
      teamEnabled: true,
      turn: "first",
    })

    expect(result.status).toBe(0)
    expect(calls).toEqual(["deep-interview", "ralplan", "ultragoal", "team", "execute"])
    expect(result.workflow.stages.map((stage) => `${stage.id}:${stage.status}`)).toEqual([
      "deep-interview:done",
      "ralplan:done",
      "ultragoal:done",
      "team:done",
      "execute:done",
    ])
  })

  test("Given a stage fails When running a turn Then later stages do not execute", async () => {
    const calls: string[] = []
    const backend: WorkflowBackend = async (input) => {
      calls.push(input.stage)
      if (input.stage === "ralplan") return { output: "plan failed", status: 7 }
      return { output: `artifact from ${input.stage}`, status: 0 }
    }

    const result = await runWorkflowTurn({
      backend,
      prompt: "fix tests",
      turn: "first",
    })

    expect(result.status).toBe(7)
    expect(calls).toEqual(["deep-interview", "ralplan"])
    expect(result.workflow.stages.map((stage) => `${stage.id}:${stage.status}`)).toEqual([
      "deep-interview:done",
      "ralplan:failed",
      "ultragoal:pending",
      "team:skipped",
      "execute:pending",
    ])
  })

  test("Given workflow state When writing it Then a JSON state artifact is created", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "opencomposer-workflow-"))
    const workflow = createInitialWorkflow({ prompt: "fix tests" })
    const target = path.join(dir, "workflow.json")

    await writeWorkflowState({ path: target, workflow })

    const saved = await Bun.file(target).text()
    expect(saved).toContain('"prompt": "fix tests"')
    expect(saved).toContain('"id": "deep-interview"')
  })
})

import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  answerDeepInterviewGate,
  createDeepInterviewGate,
  createInitialWorkflow,
  runWorkflowTurn,
  workflowCompletionEntry,
  workflowStatusSummary,
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

  test("Given a user explicitly skips deep interview When creating workflow state Then only that stage is skipped", () => {
    const workflow = createInitialWorkflow({ prompt: "skip the deep interview and fix tests" })

    expect(workflow.stages.map((stage) => `${stage.id}:${stage.status}`)).toEqual([
      "deep-interview:skipped",
      "ralplan:pending",
      "ultragoal:pending",
      "team:skipped",
      "execute:pending",
    ])
  })

  test("Given a negated skip phrase When creating workflow state Then deep interview still runs", () => {
    const workflow = createInitialWorkflow({ prompt: "I do not want to skip deep interview; fix tests" })

    expect(workflow.stages[0]).toEqual({ id: "deep-interview", status: "pending" })
  })

  test("Given a normal prompt When starting the TUI workflow Then deep interview opens before backend execution", () => {
    const gate = createDeepInterviewGate("fix tests")

    expect(gate?.questionIndex).toBe(0)
    expect(gate?.questions.length).toBeGreaterThan(1)
    expect(gate?.answers).toEqual([])
  })

  test("Given explicit skip text When starting the TUI workflow Then deep interview gate is not opened", () => {
    const gate = createDeepInterviewGate("skip the deep interview and fix tests")

    expect(gate).toBeUndefined()
  })

  test("Given interview answers When completing the gate Then workflow prompt carries the answers forward", () => {
    const gate = createDeepInterviewGate("fix tests")
    expect(gate).toBeDefined()
    if (!gate) return

    const first = answerDeepInterviewGate(gate, "Fix the broken TUI behavior.")
    expect(first.kind).toBe("next")
    if (first.kind !== "next") return

    const second = answerDeepInterviewGate(first.gate, "Do not skip interview unless explicitly requested.")
    expect(second.kind).toBe("next")
    if (second.kind !== "next") return

    const third = answerDeepInterviewGate(second.gate, "Tests must prove the workflow waits for answers.")
    expect(third.kind).toBe("complete")
    if (third.kind !== "complete") return

    expect(third.prompt).toContain("Deep-interview user answers")
    expect(third.prompt).toContain("Fix the broken TUI behavior.")
    expect(third.prompt).toContain("Tests must prove the workflow waits for answers.")
  })

  test("Given a completed workflow When summarizing Then a short markdown completion entry is created", async () => {
    const backend: WorkflowBackend = async (input) => ({ output: `artifact from ${input.stage}`, status: 0 })

    const result = await runWorkflowTurn({
      backend,
      prompt: "fix tests",
      turn: "first",
    })
    const entry = workflowCompletionEntry(result.workflow)

    expect(workflowStatusSummary(result.workflow)).toBe("workflow complete")
    expect(entry?.kind).toBe("agent")
    expect(entry?.text).toContain("## Workflow summary")
    expect(entry?.text).toContain("**Deep interview**")
    expect(entry?.text).toContain("**Execute**")
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

  test("Given progress callbacks When running a turn Then stage state changes are emitted immediately", async () => {
    const progress: string[] = []
    const backend: WorkflowBackend = async (input) => {
      input.onEntry?.({ kind: "agent", text: `live ${input.stage}` })
      return { output: `artifact from ${input.stage}`, status: 0 }
    }

    await runWorkflowTurn({
      backend,
      onProgress: (entry) => {
        progress.push(`${entry.kind}:${entry.text}`)
      },
      prompt: "fix tests",
      resultEntries: "none",
      turn: "first",
    })

    expect(progress).toContain("system:workflow deep-interview: running")
    expect(progress).toContain("agent:live deep-interview")
    expect(progress).toContain("system:workflow execute: done")
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

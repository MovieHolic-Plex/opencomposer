import { mkdir } from "node:fs/promises"
import path from "node:path"

export const WORKFLOW_STAGE_IDS = ["deep-interview", "ralplan", "ultragoal", "team", "execute"] as const

export type WorkflowStageId = (typeof WORKFLOW_STAGE_IDS)[number]
export type WorkflowStageStatus = "pending" | "running" | "done" | "failed" | "skipped"

export type WorkflowStage = {
  readonly artifact?: string
  readonly id: WorkflowStageId
  readonly prompt?: string
  readonly status: WorkflowStageStatus
}

export type WorkflowState = {
  readonly prompt: string
  readonly stages: readonly WorkflowStage[]
}

export type WorkflowBackend = (input: {
  readonly prompt: string
  readonly stage: WorkflowStageId
  readonly turn: "first" | "follow-up"
}) => Promise<{ readonly output: string; readonly status: number }>

export type WorkflowUpdate = (workflow: WorkflowState) => Promise<void> | void

export type WorkflowEntry = { readonly kind: "agent" | "error" | "system"; readonly text: string }

export type WorkflowResult = {
  readonly entries: readonly WorkflowEntry[]
  readonly status: number
  readonly workflow: WorkflowState
}

export function createInitialWorkflow(input: {
  readonly prompt: string
  readonly teamEnabled?: boolean
}): WorkflowState {
  return {
    prompt: input.prompt,
    stages: WORKFLOW_STAGE_IDS.map((id) => ({
      id,
      status: id === "team" && !input.teamEnabled ? "skipped" : "pending",
    })),
  }
}

export async function runWorkflowTurn(input: {
  readonly backend: WorkflowBackend
  readonly onUpdate?: WorkflowUpdate
  readonly prompt: string
  readonly teamEnabled?: boolean
  readonly turn: "first" | "follow-up"
}) {
  const initial = createInitialWorkflow({ prompt: input.prompt, teamEnabled: input.teamEnabled })
  const context: WorkflowStage[] = []
  let workflow = initial

  for (const stage of initial.stages) {
    if (stage.status === "skipped") {
      context.push(stage)
      continue
    }
    const stagePrompt = createStagePrompt({ prompt: input.prompt, stage: stage.id, stages: context })
    workflow = updateStage(workflow, { ...stage, prompt: stagePrompt, status: "running" })
    await input.onUpdate?.(workflow)
    const result = await input.backend({
      prompt: stagePrompt,
      stage: stage.id,
      turn: context.some((item) => item.status === "done") || input.turn === "follow-up" ? "follow-up" : "first",
    })
    const nextStage = {
      ...stage,
      artifact: result.output,
      prompt: stagePrompt,
      status: result.status === 0 ? "done" : "failed",
    } satisfies WorkflowStage
    workflow = updateStage(workflow, nextStage)
    await input.onUpdate?.(workflow)
    context.push(nextStage)
    if (result.status !== 0) return workflowResult({ status: result.status, workflow })
  }

  return workflowResult({ status: 0, workflow })
}

export async function writeWorkflowState(input: { readonly path?: string; readonly workflow: WorkflowState }) {
  const statePath = input.path ?? ".opencomposer/workflow.json"
  await mkdir(path.dirname(statePath), { recursive: true })
  await Bun.write(statePath, `${JSON.stringify(input.workflow, null, 2)}\n`)
}

export function createStagePrompt(input: {
  readonly prompt: string
  readonly stage: WorkflowStageId
  readonly stages: readonly WorkflowStage[]
}) {
  if (input.stage === "deep-interview") {
    return [
      "OpenComposer workflow stage: deep-interview.",
      "Clarify the user's request, identify missing decisions, and state concrete assumptions if enough context exists.",
      `User request: ${input.prompt}`,
    ].join("\n")
  }
  if (input.stage === "ralplan") {
    return [
      "OpenComposer workflow stage: ralplan.",
      "Create a concise implementation plan from the request and deep-interview artifact.",
      artifactContext(input.stages),
      `User request: ${input.prompt}`,
    ].join("\n")
  }
  if (input.stage === "ultragoal") {
    return [
      "OpenComposer workflow stage: ultragoal.",
      "Convert the plan into measurable goals, acceptance checks, and stop conditions.",
      artifactContext(input.stages),
      `User request: ${input.prompt}`,
    ].join("\n")
  }
  if (input.stage === "team") {
    return [
      "OpenComposer workflow stage: team.",
      "Decide whether parallel workers are useful and describe worker lanes only when they materially help.",
      artifactContext(input.stages),
      `User request: ${input.prompt}`,
    ].join("\n")
  }
  return [
    "OpenComposer workflow stage: execute.",
    "Execute the original request using the gathered workflow artifacts. Be direct and preserve the user's intent.",
    artifactContext(input.stages),
    `User request: ${input.prompt}`,
  ].join("\n")
}

function updateStage(workflow: WorkflowState, stage: WorkflowStage): WorkflowState {
  return {
    ...workflow,
    stages: workflow.stages.map((item) => (item.id === stage.id ? stage : item)),
  }
}

function workflowResult(input: { readonly status: number; readonly workflow: WorkflowState }): WorkflowResult {
  return {
    entries: input.workflow.stages.flatMap((stage) => workflowEntries(stage)),
    status: input.status,
    workflow: input.workflow,
  }
}

function workflowEntries(stage: WorkflowStage): readonly WorkflowEntry[] {
  if (stage.status === "skipped") return [{ kind: "system", text: `workflow ${stage.id}: skipped` }]
  if (!stage.artifact) return []
  return [{ kind: stage.status === "failed" ? "error" : "agent", text: `workflow ${stage.id}: ${stage.artifact}` }]
}

function artifactContext(stages: readonly WorkflowStage[]) {
  const artifacts = stages
    .filter((stage) => stage.artifact && stage.status === "done")
    .map((stage) => `## ${stage.id}\n${stage.artifact}`)
    .join("\n\n")
  if (artifacts.length === 0) return "No prior workflow artifact."
  return artifacts
}

import { mkdir } from "node:fs/promises"
import path from "node:path"

export const WORKFLOW_STAGE_IDS = ["deep-interview", "ralplan", "ultragoal", "team", "execute"] as const
export const DEEP_INTERVIEW_QUESTIONS = [
  "What result should OpenComposer produce?",
  "What constraints, non-goals, or preferences must be preserved?",
  "What evidence should prove the work is complete?",
] as const

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
  readonly onEntry?: WorkflowProgress
  readonly prompt: string
  readonly stage: WorkflowStageId
  readonly turn: "first" | "follow-up"
}) => Promise<{ readonly output: string; readonly status: number }>

export type WorkflowUpdate = (workflow: WorkflowState) => Promise<void> | void

export type WorkflowEntry = { readonly id?: string; readonly kind: "agent" | "error" | "system"; readonly text: string }

export type WorkflowProgress = (entry: WorkflowEntry) => Promise<void> | void

export type WorkflowResult = {
  readonly entries: readonly WorkflowEntry[]
  readonly status: number
  readonly workflow: WorkflowState
}

export type DeepInterviewGate = {
  readonly answers: readonly string[]
  readonly prompt: string
  readonly questionIndex: number
  readonly questions: readonly string[]
}

export type DeepInterviewGateResult =
  | { readonly gate: DeepInterviewGate; readonly kind: "next" }
  | { readonly kind: "complete"; readonly prompt: string }
  | { readonly kind: "skip"; readonly prompt: string }

export function createInitialWorkflow(input: {
  readonly prompt: string
  readonly teamEnabled?: boolean
}): WorkflowState {
  const skipDeepInterview = shouldSkipDeepInterview(input.prompt)
  return {
    prompt: input.prompt,
    stages: WORKFLOW_STAGE_IDS.map((id) => ({
      id,
      status:
        (id === "deep-interview" && skipDeepInterview) || (id === "team" && !input.teamEnabled) ? "skipped" : "pending",
    })),
  }
}

export function createDeepInterviewGate(prompt: string): DeepInterviewGate | undefined {
  if (shouldSkipDeepInterview(prompt)) return undefined
  return {
    answers: [],
    prompt,
    questionIndex: 0,
    questions: DEEP_INTERVIEW_QUESTIONS,
  }
}

export function answerDeepInterviewGate(gate: DeepInterviewGate, answer: string): DeepInterviewGateResult {
  const trimmed = answer.trim()
  if (isDeepInterviewRuntimeSkip(trimmed)) {
    return {
      kind: "skip",
      prompt: `${gate.prompt}\n\nOpenComposer control: skip the deep interview.`,
    }
  }

  const answers = [...gate.answers, trimmed]
  if (answers.length < gate.questions.length) {
    return {
      gate: {
        ...gate,
        answers,
        questionIndex: answers.length,
      },
      kind: "next",
    }
  }

  return {
    kind: "complete",
    prompt: createDeepInterviewAnsweredPrompt({ answers, prompt: gate.prompt, questions: gate.questions }),
  }
}

export async function runWorkflowTurn(input: {
  readonly backend: WorkflowBackend
  readonly onUpdate?: WorkflowUpdate
  readonly onProgress?: WorkflowProgress
  readonly prompt: string
  readonly resultEntries?: "none" | "summary"
  readonly teamEnabled?: boolean
  readonly turn: "first" | "follow-up"
}) {
  const initial = createInitialWorkflow({ prompt: input.prompt, teamEnabled: input.teamEnabled })
  const context: WorkflowStage[] = []
  let workflow = initial

  for (const stage of initial.stages) {
    if (stage.status === "skipped") {
      context.push(stage)
      await input.onProgress?.({ kind: "system", text: `workflow ${stage.id}: skipped` })
      continue
    }
    const stagePrompt = createStagePrompt({ prompt: input.prompt, stage: stage.id, stages: context })
    workflow = updateStage(workflow, { ...stage, prompt: stagePrompt, status: "running" })
    await input.onUpdate?.(workflow)
    await input.onProgress?.({ kind: "system", text: `workflow ${stage.id}: running` })
    const result = await input.backend({
      onEntry: input.onProgress,
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
    await input.onProgress?.({
      kind: nextStage.status === "failed" ? "error" : "system",
      text: `workflow ${stage.id}: ${nextStage.status}`,
    })
    context.push(nextStage)
    if (result.status !== 0) {
      return workflowResult({ resultEntries: input.resultEntries ?? "summary", status: result.status, workflow })
    }
  }

  return workflowResult({ resultEntries: input.resultEntries ?? "summary", status: 0, workflow })
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

function workflowResult(input: {
  readonly resultEntries: "none" | "summary"
  readonly status: number
  readonly workflow: WorkflowState
}): WorkflowResult {
  return {
    entries: input.resultEntries === "none" ? [] : input.workflow.stages.flatMap((stage) => workflowEntries(stage)),
    status: input.status,
    workflow: input.workflow,
  }
}

function workflowEntries(stage: WorkflowStage): readonly WorkflowEntry[] {
  if (stage.status === "skipped") return [{ kind: "system", text: `workflow ${stage.id}: skipped` }]
  if (!stage.artifact) return []
  return [{ kind: stage.status === "failed" ? "error" : "agent", text: `workflow ${stage.id}: ${stage.artifact}` }]
}

export function workflowStatusSummary(workflow: WorkflowState | undefined) {
  if (!workflow) return "workflow ready"
  const failed = workflow.stages.find((stage) => stage.status === "failed")
  if (failed) return `workflow ${failed.id} failed`
  const running = workflow.stages.find((stage) => stage.status === "running")
  if (running) return `workflow ${running.id} running`
  const activeStages = workflow.stages.filter((stage) => stage.status !== "skipped")
  const doneCount = activeStages.filter((stage) => stage.status === "done").length
  if (doneCount === activeStages.length) return "workflow complete"
  const next = activeStages.find((stage) => stage.status === "pending")
  return `workflow ${doneCount}/${activeStages.length}${next ? ` next ${next.id}` : ""}`
}

export function workflowCompletionEntry(workflow: WorkflowState): WorkflowEntry | undefined {
  const activeStages = workflow.stages.filter((stage) => stage.status !== "skipped")
  if (activeStages.length === 0 || activeStages.some((stage) => stage.status !== "done")) return undefined
  const lines = activeStages.map((stage) => `- **${stageLabel(stage.id)}**: ${stageCompletion(stage.id)}`)
  return {
    id: "workflow-completion-summary",
    kind: "agent",
    text: ["## Workflow summary", ...lines].join("\n"),
  }
}

function artifactContext(stages: readonly WorkflowStage[]) {
  const artifacts = stages
    .filter((stage) => stage.artifact && stage.status === "done")
    .map((stage) => `## ${stage.id}\n${stage.artifact}`)
    .join("\n\n")
  if (artifacts.length === 0) return "No prior workflow artifact."
  return artifacts
}

function shouldSkipDeepInterview(prompt: string) {
  const normalized = prompt.toLowerCase().replace(/[-_]/g, " ")
  if (
    [
      "do not skip deep interview",
      "don't skip deep interview",
      "dont skip deep interview",
      "do not skip the deep interview",
      "don't skip the deep interview",
      "dont skip the deep interview",
      "do not want to skip deep interview",
      "don't want to skip deep interview",
      "dont want to skip deep interview",
      "do not want to skip the deep interview",
      "don't want to skip the deep interview",
      "dont want to skip the deep interview",
      "not skip deep interview",
      "not skip the deep interview",
      "딥인터뷰 생략하지마",
      "딥 인터뷰 생략하지마",
      "인터뷰 생략하지마",
    ].some((phrase) => normalized.includes(phrase))
  ) {
    return false
  }
  return [
    "skip deep interview",
    "skip the deep interview",
    "skip deepinterview",
    "no deep interview",
    "without deep interview",
    "deep interview skip",
    "딥인터뷰 생략",
    "딥 인터뷰 생략",
    "인터뷰 생략",
    "인터뷰 하지마",
  ].some((phrase) => normalized.includes(phrase))
}

function isDeepInterviewRuntimeSkip(answer: string) {
  const normalized = answer.toLowerCase()
  return normalized === "/skip" || normalized === "/skip deep interview" || shouldSkipDeepInterview(answer)
}

function createDeepInterviewAnsweredPrompt(input: {
  readonly answers: readonly string[]
  readonly prompt: string
  readonly questions: readonly string[]
}) {
  const answers = input.answers.map((answer, index) => {
    const question = input.questions[index] ?? `Question ${index + 1}`
    return `Q${index + 1}: ${question}\nA${index + 1}: ${answer}`
  })
  return [input.prompt, "Deep-interview user answers:", ...answers].join("\n\n")
}

function stageLabel(stage: WorkflowStageId) {
  if (stage === "deep-interview") return "Deep interview"
  if (stage === "ralplan") return "Plan"
  if (stage === "ultragoal") return "Goal checks"
  if (stage === "team") return "Team"
  return "Execute"
}

function stageCompletion(stage: WorkflowStageId) {
  if (stage === "deep-interview") return "clarified the request and assumptions"
  if (stage === "ralplan") return "prepared the implementation path"
  if (stage === "ultragoal") return "set completion checks"
  if (stage === "team") return "ran optional parallel work"
  return "applied the requested work"
}

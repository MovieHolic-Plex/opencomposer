# opencomposer

OpenComposer는 Cursor Composer 2.5를 더 나은 terminal surface에서 쓰기 위한
OpenCode fork입니다.

Composer 2.5는 Cursor Agent를 통해서만 사용할 수 있습니다. OpenComposer는 모델을
재구현하지 않습니다. Cursor Agent를 runtime backend로 유지하고, 그 앞에 OpenTUI 기반
interface를 붙입니다.

번역: [English](README.md), [日本語](README.ja.md), [简体中文](README.zh.md),
[繁體中文](README.zht.md).

## 동작하는 것

- 기본 모델: `composer-2.5`
- 기본 명령: `opencomposer`
- 기본 UI: transcript, composer input, status, 상단 header의 compact workflow progress를
  갖춘 OpenTUI session surface
- Backend: `cursor-agent --model composer-2.5 --print --trust --force`
- Workflow: interactive turn은 `deep-interview -> ralplan -> ultragoal -> execute`를
  순서대로 실행합니다. `OPENCOMPOSER_ENABLE_TEAM=1`을 주면 execution 전에 optional
  `team` stage도 실행합니다.
- Deep interview gate: prompt에서 명시적으로 생략하라고 하지 않는 한, TUI가 interview
  질문을 받고 답변이 들어오기 전에는 `ralplan`, `ultragoal`, `execute`를 시작하지 않습니다.
- State: workflow update는 매번 `.opencomposer/workflow.json`에 기록됩니다.
- 이어지는 대화: TUI follow-up turn은 `--continue`로 전달
- YOLO mode: `--yolo`가 Cursor Agent unattended 실행 flag를 전달
- 우회 경로: `--headless`, `--acp`, 실험용 `--opencode-tui`

## 빠른 시작

checkout한 저장소에서:

```bash
bun install
ln -sf "$PWD/packages/opencode/bin/opencomposer" ~/.local/bin/opencomposer

cd /path/to/your/project
opencomposer
```

자주 쓰는 실행:

```bash
opencomposer --yolo
OPENCOMPOSER_ENABLE_TEAM=1 opencomposer
opencomposer --headless "fix the failing tests"
opencomposer --headless --yolo "run the migration and fix errors"
opencomposer --acp
opencomposer --opencode-tui
```

명령 연결 확인:

```bash
opencomposer --dry-run
opencomposer --dry-run --headless "fix tests"
opencomposer --dry-run --acp
```

예상 출력:

```bash
opencomposer-tui --backend cursor-agent --model composer-2.5
cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'
cursor-agent --model composer-2.5 acp
```

## 현재 한계

OpenComposer는 아직 완성된 OpenCode 재설계가 아니라 bridge layer입니다.

- Cursor Agent가 계속 model runtime입니다.
- 모델 선택은 Cursor Agent model ID 범위로 제한됩니다.
- 기본 OpenComposer TUI는 bridge를 위해 직접 만든 OpenTUI 기반 화면입니다.
- upstream OpenCode TUI는 `--opencode-tui`로 보존했지만 Composer session과 완전히
  연결되지는 않았습니다.

## 개발

OpenComposer 코드는 `packages/opencode/src/opencomposer`에 있습니다.

검사는 package directory에서 실행합니다.

```bash
cd packages/opencode
bun test test/opencomposer/cursor-agent.test.ts test/opencomposer/cli.test.ts test/opencomposer/opencode-tui.test.ts test/opencomposer/tui.test.ts test/opencomposer/workflow.test.ts
bun typecheck
```

## 보안

OpenComposer는 현재 프로젝트 directory에서 Cursor Agent를 child process로 실행합니다.
`--yolo`는 unattended 실행 mode입니다. Cursor Agent approval flag를 전달하므로 broad
tool execution을 허용할 수 있습니다.

Cursor credential, project secret, `.env` 파일, private key, local Cursor/agent state를
공개 저장소에 올리지 마십시오.

## OpenCode / Cursor와의 관계

이 저장소는 독립 fork입니다. OpenCode 또는 Cursor가 만들었거나 후원하거나 보증한
프로젝트가 아닙니다.

OpenCode source와 license notice는 MIT License 조건에 따라 보존합니다.

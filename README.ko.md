# opencomposer

opencomposer는 Composer 2.5를 위해 만든 OpenCode fork입니다.

Composer 2.5 모델 자체를 재구현하는 프로젝트가 아닙니다. Composer 2.5는
Cursor Agent를 통해서만 쓸 수 있으므로, opencomposer는 Cursor Agent를
model/runtime backend로 두고 OpenCode의 terminal product surface를 그 위에
맞추는 방향으로 갑니다.

## 현재 상태

현재 저장소는 fork foundation 단계입니다.

- Upstream base: `anomalyco/opencode` / `sst/opencode`, default branch `dev`
- License: OpenCode에서 이어받은 MIT
- Default model: `composer-2.5`
- Runtime backend: `cursor-agent`
- 첫 bridge 위치: `packages/opencode/src/opencomposer`

`opencomposer` 명령은 기본적으로 OpenCode-style session surface를 엽니다. 화면은
transcript, composer input, status footer, 넓은 터미널의 workflow/sidebar rail로
구성됩니다. Cursor Agent는 화면으로 직접 노출되지 않고 Composer 2.5 backend로만
호출됩니다. headless 또는 ACP mode를 명시한 경우에만 Cursor Agent 명령을 직접
실행합니다. upstream OpenCode TUI shell은 아직 Composer backend에 연결되지 않았으므로
`--opencode-tui` 실험 옵션으로 분리했습니다.

## 사용법

이 저장소에서:

```bash
opencomposer
opencomposer "fix tests"
opencomposer --yolo "fix tests"
opencomposer --opencode-tui
```

설치 없이 저장소에서 직접 확인:

```bash
bun run --cwd packages/opencode opencomposer --dry-run
bun run --cwd packages/opencode opencomposer --dry-run "fix tests"
bun run --cwd packages/opencode opencomposer --dry-run --opencode-tui
```

예상 dry run:

```bash
opencomposer-tui --backend cursor-agent --model composer-2.5
opencomposer-tui --backend cursor-agent --model composer-2.5 --prompt 'fix tests'
cd .../packages/opencode && bun run --conditions=browser .../src/index.ts ...
```

Headless / ACP bridge:

```bash
bun run --cwd packages/opencode opencomposer --dry-run --headless "fix tests"
# cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'

bun run --cwd packages/opencode opencomposer --dry-run --acp
# cursor-agent --model composer-2.5 acp
```

yolo:

```bash
opencomposer --yolo
opencomposer --headless --yolo "fix tests"
```

기본 TUI/headless/ACP yolo는 내부 Composer backend에 `--yolo --sandbox disabled
--approve-mcps`를 전달합니다. `--opencode-tui --yolo`는 해당 실행에만
`OPENCODE_PERMISSION='{"*":"allow"}'`를 주입합니다.

필요할 때 모델 override:

```bash
bun run --cwd packages/opencode opencomposer --dry-run --model composer-2.5-fast --acp
```

## Roadmap

1. upstream OpenCode TUI와 build system은 유지한다.
2. model/runtime path를 Cursor Agent ACP client로 교체한다.
3. OpenCode TUI session surface를 Cursor ACP update stream에 연결한다.
4. Composer 2.5를 기본 모델로 유지하고 UI에 명확히 표시한다.
5. provider/model 설정은 Composer 2.5가 일반 OpenCode provider model인 것처럼
   보이지 않게 다시 설계한다.

## Fork Notice

opencomposer는 Cursor Composer 2.5 workflow를 위한 독립 fork입니다. OpenCode
팀이 만들었거나 후원하거나 제휴한 프로젝트가 아닙니다.

OpenCode source와 license는 MIT License 조건에 따라 이 fork에 보존되어
있습니다.

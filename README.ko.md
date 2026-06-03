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

첫 bridge는 Cursor Agent를 headless 또는 ACP mode로 실행할 때 `--model
composer-2.5`를 항상 넣습니다. 명시적인 override는 허용합니다.

## 사용법

이 저장소에서:

```bash
bun run --cwd packages/opencode opencomposer --dry-run "fix tests"
```

예상 dry run:

```bash
cursor-agent --model composer-2.5 --print --trust --force --output-format text 'fix tests'
```

ACP mode:

```bash
bun run --cwd packages/opencode opencomposer --dry-run --acp
# cursor-agent --model composer-2.5 acp
```

필요할 때 override:

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

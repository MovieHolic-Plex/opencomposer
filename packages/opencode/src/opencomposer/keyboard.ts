export type KeyboardInput = {
  readonly ctrl?: boolean
  readonly meta?: boolean
  readonly name: string
  readonly raw: string
}

export function isSubmitKey(input: KeyboardInput) {
  return (
    input.name === "return" ||
    input.name === "linefeed" ||
    input.name === "enter" ||
    input.raw === "\r" ||
    input.raw === "\n"
  )
}

export function isBackspaceKey(input: KeyboardInput) {
  return input.name === "backspace" || input.raw === "\u007f"
}

export function printableKey(input: KeyboardInput) {
  if (input.ctrl || input.meta || input.raw.length === 0 || isSubmitKey(input) || isBackspaceKey(input))
    return undefined
  if (/[\x00-\x1f\x7f]/.test(input.raw)) return undefined
  return input.raw
}

import type { AnswerableBlock, CardBlock, FieldState, StageBlock } from "./types"

function humanize(id: string): string {
  return id
    .replace(/^tmpl_/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function isAnswerable(block: StageBlock): block is AnswerableBlock {
  return (
    block.display_type === "input" ||
    block.display_type === "textarea" ||
    block.display_type === "chips" ||
    (block.display_type === "list" && Boolean(block.selectable)) ||
    (block.display_type === "card" && Boolean(block.selectable))
  )
}

export function getAnswerId(block: AnswerableBlock): string {
  return block.display_type === "card" ? block.question_id ?? block.id : block.id
}

export function isBlockAnswered(block: StageBlock, values: FieldState): boolean {
  if (!isAnswerable(block) || !block.required) return true
  const value = values[getAnswerId(block)]
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
}

function getAnswerableLabel(block: AnswerableBlock): string {
  if (block.display_type === "input" || block.display_type === "textarea") {
    return block.label
  }
  if (block.display_type === "chips") return block.label ?? humanize(block.id)
  return humanize(getAnswerId(block))
}

function labelForValue(block: AnswerableBlock, value: string, allBlocks: StageBlock[]): string {
  if (block.display_type === "chips" || block.display_type === "list") {
    return block.items.find((item) => item.value === value)?.label ?? humanize(value)
  }
  if (block.display_type === "card") {
    const answerId = getAnswerId(block)
    const match = allBlocks.find(
      (candidate): candidate is CardBlock =>
        candidate.display_type === "card" &&
        (candidate.question_id ?? candidate.id) === answerId &&
        candidate.id === value
    )
    return match?.title ?? humanize(value)
  }
  return value
}

export function uniqueAnswerableBlocks(blocks: StageBlock[]): AnswerableBlock[] {
  const seen = new Set<string>()
  const result: AnswerableBlock[] = []
  for (const block of blocks) {
    if (!isAnswerable(block)) continue
    const answerId = getAnswerId(block)
    if (seen.has(answerId)) continue
    seen.add(answerId)
    result.push(block)
  }
  return result
}

export function formatAnswers(blocks: StageBlock[], values: FieldState): string {
  const answerable = uniqueAnswerableBlocks(blocks)
  const includeLabels = answerable.length > 1

  const lines: string[] = []
  for (const block of answerable) {
    const value = values[getAnswerId(block)]
    const rawValues = Array.isArray(value) ? value : value?.trim() ? [value.trim()] : []
    if (rawValues.length === 0) continue
    const text = rawValues.map((v) => labelForValue(block, v, blocks)).join(", ")
    lines.push(includeLabels ? `${getAnswerableLabel(block)}: ${text}` : text)
  }
  return lines.join("\n")
}

export function getInitialValues(blocks: StageBlock[]): FieldState {
  const initial: FieldState = {}

  for (const block of blocks) {
    if (block.display_type === "chips" || block.display_type === "list") {
      if (block.display_type === "list" && !block.selectable) continue
      const selectedValues = block.items
        .filter((item) => item.selected)
        .map((item) => item.value)
      if (selectedValues.length === 0) continue
      initial[block.id] = block.multi ? selectedValues : selectedValues[0]
    } else if (block.display_type === "card" && block.selectable && block.selected) {
      const answerId = getAnswerId(block)
      if (block.multi) {
        const existing = initial[answerId]
        initial[answerId] = Array.isArray(existing) ? [...existing, block.id] : [block.id]
      } else if (!initial[answerId]) {
        initial[answerId] = block.id
      }
    }
  }

  return initial
}

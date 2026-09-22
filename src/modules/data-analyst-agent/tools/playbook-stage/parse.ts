import type { CardBlock, PlaybookStageData, StageBlock } from "./types"

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    const decoded = NAMED_HTML_ENTITIES[entity.toLowerCase()]
    return decoded ?? match
  })
}

function deepDecodeEntities<T>(value: T): T {
  if (typeof value === "string") {
    return decodeHtmlEntities(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deepDecodeEntities(entry)) as unknown as T
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      result[key] = deepDecodeEntities(entry)
    }
    return result as T
  }
  return value
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{")
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (escape) escape = false
      else if (char === "\\") escape = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === "{") depth++
    else if (char === "}") {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function mergeDuplicateSelectionBlocks(blocks: StageBlock[]): StageBlock[] {
  const merged: StageBlock[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (block.display_type === "list") {
      const next = blocks[i + 1]
      if (next?.display_type === "chips") {
        const listValues = new Set(block.items.map((item) => item.value))
        const chipValues = new Set(next.items.map((item) => item.value))
        const sameItems =
          listValues.size > 0 &&
          listValues.size === chipValues.size &&
          [...listValues].every((value) => chipValues.has(value))

        if (sameItems) {
          const chipsByValue = new Map(next.items.map((item) => [item.value, item]))
          merged.push({
            ...block,
            id: next.id,
            selectable: true,
            multi: next.multi,
            required: next.required,
            items: block.items.map((item) => ({
              ...item,
              selected: item.selected || chipsByValue.get(item.value)?.selected || false,
            })),
          })
          i++
          continue
        }
      }
    }

    if (block.display_type === "card") {
      let runEnd = i
      while (blocks[runEnd + 1]?.display_type === "card") runEnd++
      const chips = blocks[runEnd + 1]

      if (chips?.display_type === "chips") {
        const cardRun = blocks.slice(i, runEnd + 1) as CardBlock[]
        const cardIds = new Set(cardRun.map((card) => card.id))
        const chipValues = new Set(chips.items.map((item) => item.value))
        const sameItems =
          cardIds.size > 0 &&
          cardIds.size === chipValues.size &&
          [...cardIds].every((value) => chipValues.has(value))

        if (sameItems) {
          const chipsByValue = new Map(chips.items.map((item) => [item.value, item]))
          for (const card of cardRun) {
            merged.push({
              ...card,
              selectable: true,
              question_id: chips.id,
              multi: chips.multi,
              required: chips.required,
              selected: card.selected || chipsByValue.get(card.id)?.selected || false,
            })
          }
          i = runEnd + 1
          continue
        }
      }
    }

    merged.push(block)
  }

  return merged
}

export function parsePlaybookStage(text: string): PlaybookStageData | null {
  const jsonText = extractJsonObject(text)
  if (!jsonText) return null

  let data: unknown
  try {
    data = deepDecodeEntities(JSON.parse(jsonText))
  } catch {
    return null
  }
  if (!data || typeof data !== "object") return null

  const obj = data as Record<string, unknown>
  if (typeof obj.stage !== "string" || typeof obj.stage_title !== "string") {
    return null
  }
  if (!Array.isArray(obj.blocks)) return null
  if (obj.next_stage !== undefined && obj.next_stage !== null && typeof obj.next_stage !== "string") {
    return null
  }

  const stageData = obj as unknown as PlaybookStageData
  return {
    ...stageData,
    next_stage: (obj.next_stage as string | null | undefined) ?? null,
    blocks: mergeDuplicateSelectionBlocks(stageData.blocks),
  }
}

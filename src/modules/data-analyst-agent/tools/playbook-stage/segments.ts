import type { CardBlock, StageBlock } from "./types"

export type RenderSegment =
  | { kind: "single"; index: number; block: StageBlock }
  | { kind: "card-row"; entries: { index: number; block: CardBlock }[] }

export function groupCardRuns(blocks: StageBlock[]): RenderSegment[] {
  const segments: RenderSegment[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.display_type === "card" && block.selectable) {
      const entries: { index: number; block: CardBlock }[] = []
      while (
        i < blocks.length &&
        blocks[i].display_type === "card" &&
        (blocks[i] as CardBlock).selectable
      ) {
        entries.push({ index: i, block: blocks[i] as CardBlock })
        i++
      }
      if (entries.length > 1) {
        segments.push({ kind: "card-row", entries })
      } else {
        segments.push({ kind: "single", index: entries[0].index, block: entries[0].block })
      }
    } else {
      segments.push({ kind: "single", index: i, block })
      i++
    }
  }
  return segments
}

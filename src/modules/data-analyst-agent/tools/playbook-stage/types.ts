export type ListItem = {
  label: string
  value: string
  description?: string
  selected?: boolean
}
export type ChipItem = { label: string; value: string; selected?: boolean }
export type FieldPair = { label: string; value: string }

export type MarkdownBlock = { display_type: "markdown"; display_value: string }
export type InputBlock = {
  display_type: "input"
  id: string
  label: string
  placeholder?: string
  required?: boolean
}
export type TextareaBlock = {
  display_type: "textarea"
  id: string
  label: string
  placeholder?: string
  required?: boolean
}
export type ListBlock = {
  display_type: "list"
  id: string
  items: ListItem[]
  selectable?: boolean
  multi?: boolean
  required?: boolean
}
export type ChipsBlock = {
  display_type: "chips"
  id: string
  label?: string
  items: ChipItem[]
  multi?: boolean
  required?: boolean
}
export type CardBlock = {
  display_type: "card"
  id: string
  title: string
  fields: FieldPair[]
  selectable?: boolean
  question_id?: string
  multi?: boolean
  required?: boolean
  selected?: boolean
}
export type PreviewBlock = {
  display_type: "preview"
  id: string
  title: string
  sections: FieldPair[]
}
export type ConfirmBlock = { display_type: "confirm"; id: string; label: string }
export type FinalBlock = {
  display_type: "final"
  id: string
  title: string
  display_value: string
  stats?: FieldPair[]
}
export type ToolCallBlock = {
  display_type: "tool_call"
  tool_name: string
  tool_params?: Record<string, unknown>
}

export type StageBlock =
  | MarkdownBlock
  | InputBlock
  | TextareaBlock
  | ListBlock
  | ChipsBlock
  | CardBlock
  | PreviewBlock
  | ConfirmBlock
  | FinalBlock
  | ToolCallBlock

export type PlaybookStageData = {
  stage: string
  stage_title: string
  blocks: StageBlock[]
  next_stage: string | null
}

export type FieldValue = string | string[]
export type FieldState = Record<string, FieldValue>

export type AnswerableBlock = InputBlock | TextareaBlock | ChipsBlock | ListBlock | CardBlock

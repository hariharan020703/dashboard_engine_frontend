import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ReviewItem, ReviewItemUpdate } from '../../types'

/**
 * Type-specific editors for a review item.
 *
 * Deliberately not one generic form. A metric has a formula and a unit; a
 * relationship has four column references and a cardinality; a definition has
 * neither. A single form covering all of them shows every field to every item
 * and leaves most of them blank and meaningless, which is how somebody ends up
 * setting a "formula" on a table description.
 *
 * Each editor reads its type-specific values out of `item.fields` — the
 * backend's own payload for that type — and writes them back the same way, so
 * adding a review type is an editor here plus a case in the switch, with no
 * change to the API contract or to the queue.
 */

export interface EditorProps {
  item: ReviewItem
  value: ReviewItemUpdate
  onChange: (next: ReviewItemUpdate) => void
}

/** Reads a string out of the untyped `fields` bag without asserting a shape. */
function fieldString(fields: Record<string, unknown> | null, key: string): string {
  const value = fields?.[key]
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)
}

function Field({
  id,
  label,
  help,
  children,
}: {
  id: string
  label: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  )
}

function MetricEditor({ item, value, onChange }: EditorProps) {
  return (
    <div className="space-y-4">
      <Field id="r-name" label="Name">
        <Input
          id="r-name"
          value={value.name ?? item.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Field>
      <Field
        id="r-formula"
        label="Formula"
        help="How the metric is calculated. The backend validates this against the model on save."
      >
        <Textarea
          id="r-formula"
          rows={3}
          className="font-mono text-xs"
          value={value.formula ?? item.formula ?? ''}
          onChange={(e) => onChange({ ...value, formula: e.target.value })}
        />
      </Field>
      <Field id="r-description" label="Description">
        <Textarea
          id="r-description"
          rows={3}
          value={value.description ?? item.description ?? ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </Field>
      <Field id="r-source" label="Source">
        <Input
          id="r-source"
          value={value.source ?? item.source ?? ''}
          onChange={(e) => onChange({ ...value, source: e.target.value })}
        />
      </Field>
    </div>
  )
}

function DefinitionEditor({ item, value, onChange }: EditorProps) {
  return (
    <div className="space-y-4">
      <Field id="r-name" label="Term">
        <Input
          id="r-name"
          value={value.name ?? item.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Field>
      <Field id="r-description" label="Definition">
        <Textarea
          id="r-description"
          rows={4}
          value={value.description ?? item.description ?? ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </Field>
      <Field id="r-source" label="Source" help="Where this definition came from.">
        <Input
          id="r-source"
          value={value.source ?? item.source ?? ''}
          onChange={(e) => onChange({ ...value, source: e.target.value })}
        />
      </Field>
    </div>
  )
}

function RelationshipEditor({ item, value, onChange }: EditorProps) {
  const fields = { ...(item.fields ?? {}), ...(value.fields ?? {}) }
  const set = (key: string, next: string) =>
    onChange({ ...value, fields: { ...fields, [key]: next } })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="r-src-table" label="Source table">
          <Input
            id="r-src-table"
            className="font-mono text-xs"
            value={fieldString(fields, 'sourceTable')}
            onChange={(e) => set('sourceTable', e.target.value)}
          />
        </Field>
        <Field id="r-src-col" label="Source column">
          <Input
            id="r-src-col"
            className="font-mono text-xs"
            value={fieldString(fields, 'sourceColumn')}
            onChange={(e) => set('sourceColumn', e.target.value)}
          />
        </Field>
        <Field id="r-tgt-table" label="Target table">
          <Input
            id="r-tgt-table"
            className="font-mono text-xs"
            value={fieldString(fields, 'targetTable')}
            onChange={(e) => set('targetTable', e.target.value)}
          />
        </Field>
        <Field id="r-tgt-col" label="Target column">
          <Input
            id="r-tgt-col"
            className="font-mono text-xs"
            value={fieldString(fields, 'targetColumn')}
            onChange={(e) => set('targetColumn', e.target.value)}
          />
        </Field>
      </div>
      <Field id="r-type" label="Relationship type">
        <select
          id="r-type"
          value={fieldString(fields, 'relationshipType')}
          onChange={(e) => set('relationshipType', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">Select…</option>
          <option value="one-to-one">One to one</option>
          <option value="one-to-many">One to many</option>
          <option value="many-to-one">Many to one</option>
          <option value="many-to-many">Many to many</option>
        </select>
      </Field>
    </div>
  )
}

function EntityEditor({ item, value, onChange }: EditorProps) {
  return (
    <div className="space-y-4">
      <Field id="r-name" label="Entity name">
        <Input
          id="r-name"
          value={value.name ?? item.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Field>
      <Field
        id="r-description"
        label="Description"
        help="What this entity represents in the business, and how it is identified."
      >
        <Textarea
          id="r-description"
          rows={4}
          value={value.description ?? item.description ?? ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </Field>
    </div>
  )
}

/** For a type this build has no dedicated editor for. Name and description only. */
function GenericEditor({ item, value, onChange }: EditorProps) {
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        This build has no dedicated editor for items of type{' '}
        <code className="font-mono">{item.type}</code>. Only the common fields can be edited
        here.
      </p>
      <Field id="r-name" label="Name">
        <Input
          id="r-name"
          value={value.name ?? item.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Field>
      <Field id="r-description" label="Description">
        <Textarea
          id="r-description"
          rows={4}
          value={value.description ?? item.description ?? ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </Field>
    </div>
  )
}

/** Picks the editor for an item's type. The one place that mapping lives. */
export function ReviewItemEditor(props: EditorProps) {
  switch (props.item.type) {
    case 'metric':
      return <MetricEditor {...props} />
    case 'definition':
      return <DefinitionEditor {...props} />
    case 'relationship':
      return <RelationshipEditor {...props} />
    case 'entity':
    case 'dimension':
      return <EntityEditor {...props} />
    default:
      return <GenericEditor {...props} />
  }
}


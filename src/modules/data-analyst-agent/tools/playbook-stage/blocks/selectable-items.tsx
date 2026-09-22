import {
  AlertOctagon,
  AlertTriangle,
  BookOpenCheck,
  Boxes,
  CalendarCheck,
  CalendarClock,
  CirclePlus,
  ClipboardCheck,
  ClipboardList,
  Clock6,
  Eye,
  FileText,
  Folder,
  GraduationCap,
  HardHat,
  Hourglass,
  Layers,
  ListChevronsUpDown,
  MessageSquareDiff,
  MousePointer2,
  PackageCheck,
  Search,
  ShieldCheck,
  SquarePercent,
  StickyNoteCheck,
  Tag,
  UserCog,
  type LucideIcon,
} from "lucide-react"

import { ACCENT_COLORS } from "@/modules/data-analyst-agent/tools/kpi"
import { cn } from "@/modules/data-analyst-agent/lib/utils"
import type { FieldState, FieldValue, ListItem } from "../types"
import { FieldLabel } from "./field-label"

const GREEN = "#10b981"
const RED = "var(--destructive)"
const AMBER = "#f59e0b"

type IconMatch = { Icon: LucideIcon; color?: string }

const VALUE_ICON_MAP: Record<string, IconMatch> = {
  none: { Icon: MousePointer2 },
  hourly: { Icon: Hourglass },
  daily: { Icon: CalendarCheck },
  weekly: { Icon: CalendarClock },
  six_pm: { Icon: Clock6 },
}

const LABEL_ICON_RULES: [RegExp, LucideIcon, string?][] = [
  [/v\s*&\s*v/i, StickyNoteCheck],
  [/\baar\b/i, PackageCheck],
  [/\btlo\b/i, BookOpenCheck],
  [/leader|worker/i, UserCog],
  [/not effective\s*%/i, SquarePercent, RED],
  [/not effective/i, CirclePlus, RED],
  [/effective\s*%/i, SquarePercent, GREEN],
  [/effective/i, CirclePlus, GREEN],
  [/variance\s*%/i, ListChevronsUpDown],
  [/variance/i, MessageSquareDiff],
  [/^total$/i, CirclePlus],
  [/recurring/i, Folder, GREEN],
  [/ai insight|recommendation/i, Layers, AMBER],
  [/form/i, ClipboardList],
  [/incident/i, AlertTriangle],
  [/ptp|permit/i, ShieldCheck],
  [/observ/i, Eye],
  [/report/i, FileText],
  [/audit/i, ClipboardCheck],
  [/risk/i, AlertOctagon],
  [/train/i, GraduationCap],
  [/safety/i, HardHat],
  [/inspect/i, Search],
]

const FALLBACK_ICONS: LucideIcon[] = [Layers, Boxes, Tag, Folder]

function iconForItem(item: ListItem, index: number): IconMatch {
  const byValue = VALUE_ICON_MAP[item.value.toLowerCase()]
  if (byValue) return byValue

  const byLabel = LABEL_ICON_RULES.find(([pattern]) => pattern.test(item.label))
  if (byLabel) return { Icon: byLabel[1], color: byLabel[2] }

  return { Icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length] }
}

export function SelectableItemsView({
  id,
  label,
  items,
  multi,
  required,
  interactive,
  values,
  setValue,
}: {
  id: string
  label?: string
  items: ListItem[]
  multi?: boolean
  required?: boolean
  interactive: boolean
  values: FieldState
  setValue: (id: string, value: FieldValue) => void
}) {
  const raw = values[id]
  const selected = multi
    ? Array.isArray(raw)
      ? raw
      : []
    : typeof raw === "string"
      ? [raw]
      : []

  const toggle = (value: string) => {
    if (!interactive) return
    if (multi) {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
      setValue(id, next)
    } else {
      setValue(id, value)
    }
  }

  const columns = Math.min(items.length, 5) || 1

  return (
    <div className="flex flex-col gap-1.5">
      {label && <FieldLabel label={label} required={required} />}
      <div
        className="grid w-full gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => {
          const isSelected = selected.includes(item.value)
          const { Icon, color } = iconForItem(item, index)
          const accent = color ?? ACCENT_COLORS[index % ACCENT_COLORS.length]
          return (
            <label
              key={item.value}
              title={item.description}
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                isSelected ? "border-link bg-link/10" : "border-border",
                interactive && "hover:bg-muted",
                !interactive && "cursor-not-allowed opacity-60"
              )}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  borderColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
                  backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
                }}
              >
                <Icon className="size-4" style={{ color: accent }} />
              </div>
              <span
                className={cn(
                  "text-sm font-medium text-foreground",
                  isSelected && "text-card-foreground"
                )}
              >
                {item.label}
              </span>
              <input
                type={multi ? "checkbox" : "radio"}
                name={id}
                checked={isSelected}
                disabled={!interactive}
                onChange={() => toggle(item.value)}
                className="sr-only"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}

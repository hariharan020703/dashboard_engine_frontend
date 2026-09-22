import {
  BarChart3,
  CalendarClock,
  Database,
  LayoutTemplate,
  Lightbulb,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"

const CATCHY_HEADINGS: [RegExp, string, LucideIcon][] = [
  [/schedul|run.*automat/i, "Set It and Forget It", CalendarClock],
  [/metric|kpi|measure/i, "Pick Your Numbers", BarChart3],
  [/form|dataset|data source/i, "What's on the Table", Database],
  [/scenario|use case/i, "Paint the Picture", Lightbulb],
  [/audience|recipient|business context|who.*for/i, "Who's This For", Users],
  [/template|style|layout/i, "Choose Your Style", LayoutTemplate],
  [/confirm|proceed|ready/i, "Ready to Roll?", Rocket],
]

export function catchyHeadingFor(label: string): { title: string; Icon: LucideIcon } {
  const match = CATCHY_HEADINGS.find(([pattern]) => pattern.test(label))
  return match ? { title: match[1], Icon: match[2] } : { title: "Make Your Pick", Icon: Sparkles }
}

export function PickerHeading({ label }: { label: string }) {
  const { title, Icon } = catchyHeadingFor(label)
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border p-3"
      style={{
        backgroundImage:
          "linear-gradient(90deg, color-mix(in oklab, var(--link) 10%, var(--card)) 0%, var(--card) 100%)",
      }}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-link/15">
        <Icon className="size-4.5 text-link" />
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

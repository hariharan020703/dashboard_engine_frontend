import * as React from "react"
import { ChevronDownIcon, Lightbulb, Sparkles } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/data-analyst-agent/ui/collapsible"
import { ACCENT_COLORS } from "@/modules/data-analyst-agent/tools/kpi"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"
import type { ToolFinding, ToolFindingStat, ToolInsightPoint } from "@/modules/data-analyst-agent/tools/tool_engine"

function FindingStat({
  stat_label,
  stat_value,
  accent,
}: Pick<ToolFindingStat, "stat_label" | "stat_value"> & { accent: string }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg px-3 py-1.5"
      style={{ backgroundColor: `color-mix(in oklab, ${accent} 10%, transparent)` }}
    >
      <p className="text-[11px] font-semibold tracking-wide text-nowrap text-muted-foreground uppercase">
        {stat_label}
      </p>
      <p className="text-xl font-bold tabular-nums" style={{ color: accent }}>
        {stat_value}
      </p>
    </div>
  )
}

function FindingStatsStrip({
  stats,
  accent,
}: {
  stats: ToolFindingStat[]
  accent: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((stat, statIndex) => (
        <FindingStat key={`${stat.stat_label}-${statIndex}`} {...stat} accent={accent} />
      ))}
    </div>
  )
}

function FindingPointSection({ title, detail }: ToolInsightPoint) {
  return (
    <div className="border-l-2 border-link/30 pl-3">
      <p className="text-sm font-medium text-card-foreground">{title}</p>
      <MarkdownText text={detail} />
    </div>
  )
}

export function FindingCard({ finding, index = 0 }: { finding: ToolFinding; index?: number }) {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length]
  const points = finding.points ?? []
  const hasReason = Boolean(finding.reason?.trim())
  const reasonRef = React.useRef<HTMLDivElement>(null)

  const handleReasonOpenChange = React.useCallback((open: boolean) => {
    if (!open) return
    setTimeout(() => {
      reasonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 200)
  }, [])

  return (
    <Collapsible
      className="overflow-hidden rounded-xl shadow-md"
      style={{ backgroundColor: `color-mix(in oklab, ${accent} 8%, var(--card))` }}
      onOpenChange={hasReason ? handleReasonOpenChange : undefined}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in oklab, ${accent} 22%, transparent)` }}
          >
            <Sparkles className="size-6" style={{ color: accent }} />
          </div>

          <p className="flex-1 text-base font-bold text-card-foreground">
            {finding.finding_title}
          </p>

          {hasReason && (
            <CollapsibleTrigger className="group flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground hover:bg-muted hover:text-foreground">
              <Lightbulb className="size-4 fill-amber-400 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.9)]" />
              Why Flagged
              <ChevronDownIcon className="size-3.5 transition-transform group-data-panel-open:rotate-180" />
            </CollapsibleTrigger>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {Boolean(finding.stats?.length) && (
            <FindingStatsStrip stats={finding.stats!} accent={accent} />
          )}

          <div className="rounded-lg bg-muted/40 p-3">
            <MarkdownText text={finding.summary} />
          </div>
        </div>
      </div>

      {hasReason && (
        <CollapsibleContent ref={reasonRef} className="flex flex-col gap-3 border-t px-4 py-3">
          <MarkdownText text={finding.reason!} />
          {points.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="group flex w-fit cursor-pointer items-center gap-1 text-xs font-medium text-foreground hover:text-blue-600 hover:underline">
                <span className="group-data-panel-open:hidden">
                  Show more ({points.length})
                </span>
                <span className="hidden group-data-panel-open:inline">Show less</span>
                <ChevronDownIcon className="size-3 shrink-0 transition-transform group-data-panel-open:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3 pt-3">
                {points.map((point, pointIndex) => (
                  <FindingPointSection key={`${point.title}-${pointIndex}`} {...point} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function FindingList({ findings }: { findings: ToolFinding[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionDivider label="Insights" />
      {findings.map((finding, index) => (
        <FindingCard key={`${finding.finding_title}-${index}`} finding={finding} index={index} />
      ))}
      <SectionDivider label="Overview" />
    </div>
  )
}


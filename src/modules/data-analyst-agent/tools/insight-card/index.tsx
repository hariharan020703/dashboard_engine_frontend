import { ChevronDownIcon, Lightbulb } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/data-analyst-agent/ui/collapsible"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"
import type { ToolInsight, ToolInsightPoint } from "@/modules/data-analyst-agent/tools/tool_engine"

function InsightPointSection({ title, detail }: ToolInsightPoint) {
  return (
    <div className="border-l-2 border-border pl-3">
      <p className="text-sm font-medium text-card-foreground">{title}</p>
      <MarkdownText text={detail} />
    </div>
  )
}

export function InsightCard({ insight }: { insight: ToolInsight }) {
  const points = insight.points ?? []

  return (
    <Collapsible className="rounded-xl border bg-transparent">
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-card-foreground">
        <span className="flex items-center gap-2">
          <Lightbulb className="size-3.5 shrink-0 text-muted-foreground" />
          {insight.title}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 border-t px-4 py-3">
        <MarkdownText text={insight.reason} />
        {points.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="group flex w-fit cursor-pointer items-center gap-1 text-xs font-medium text-foreground hover:text-blue-600 hover:underline">
              <span className="group-data-panel-open:hidden">
                Show more ({points.length})
              </span>
              <span className="hidden group-data-panel-open:inline">
                Show less
              </span>
              <ChevronDownIcon className="size-3 shrink-0 transition-transform group-data-panel-open:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              {points.map((point, index) => (
                <InsightPointSection key={`${point.title}-${index}`} {...point} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function InsightList({ insights }: { insights: ToolInsight[] }) {
  return (
    <div className="flex flex-col gap-2">
      {insights.map((insight, index) => (
        <InsightCard key={`${insight.title}-${index}`} insight={insight} />
      ))}
    </div>
  )
}


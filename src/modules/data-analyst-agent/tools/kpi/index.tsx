import { ChevronsDown, ChevronsUp } from "lucide-react"

import { cn } from "@/modules/data-analyst-agent/lib/utils"

export type KpiCardProps = {
  Kpi_Name: string
  Kpi_Value: string | number
  Kpi_Desc?: string
  Kpi_Metric?: string
  className?: string
  index?: number
  colored?: boolean
  large?: boolean
}

export const ACCENT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function getTrend(metric?: string): "up" | "down" | null {
  if (!metric) return null
  if (metric.trim().startsWith("-")) return "down"
  if (metric.trim().startsWith("+")) return "up"
  return null
}

export function KpiCard({
  Kpi_Name,
  Kpi_Value,
  Kpi_Desc,
  Kpi_Metric,
  className,
  index = 0,
  colored = true,
  large = false,
}: KpiCardProps) {
  const trend = getTrend(Kpi_Metric)
  const accent = colored ? ACCENT_COLORS[index % ACCENT_COLORS.length] : null

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-b-xl border-t-4 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        large ? "p-6 lg:p-8" : "p-4 lg:p-5 xl:p-6",
        className
      )}
      style={
        accent
          ? {
              borderTopColor: accent,
              backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${accent} 20%, var(--card)) 0%, var(--card) 100%)`,
            }
          : undefined
      }
    >
      <p
        className={cn(
          "font-bold tracking-wide text-card-foreground uppercase",
          large ? "text-sm lg:text-base" : "text-xs lg:text-sm"
        )}
      >
        {Kpi_Name}
      </p>
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          large ? "mt-3 lg:mt-4" : "mt-2 lg:mt-3"
        )}
      >
        <p
          className={cn(
            "font-semibold tabular-nums text-card-foreground",
            large ? "text-7xl" : "text-4xl lg:text-5xl"
          )}
          style={accent ? { color: accent } : undefined}
        >
          {Kpi_Value}
        </p>
        {Kpi_Metric && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-semibold lg:px-2.5 lg:py-1",
              large ? "text-sm lg:text-base" : "text-xs lg:text-sm",
              trend === "up" &&
                "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
              trend === "down" && "bg-destructive/10 text-destructive",
              trend === null && "bg-muted text-muted-foreground"
            )}
          >
            {trend === "up" && <ChevronsUp className="size-3.5" />}
            {trend === "down" && <ChevronsDown className="size-3.5" />}
            {Kpi_Metric}
          </span>
        )}
      </div>
      {Kpi_Desc && (
        <p
          className={cn(
            "border-t border-border text-muted-foreground",
            large
              ? "mt-3 pt-3 text-sm lg:mt-4 lg:pt-4 lg:text-base"
              : "mt-2 pt-2 text-xs lg:mt-3 lg:pt-3 lg:text-sm"
          )}
        >
          {Kpi_Desc}
        </p>
      )}
    </div>
  )
}


import * as React from "react"
import { Bot, ChevronDownIcon, Clock, User } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/data-analyst-agent/ui/collapsible"
import { cn } from "@/modules/data-analyst-agent/lib/utils"

const LOADING_MESSAGES = [
  "Thinking…",
  "Digging through the data…",
  "Crunching the numbers…",
  "Connecting the dots…",
  "Querying the dataset…",
  "Spotting patterns…",
  "Running the analysis…",
  "Double-checking the details…",
  "Synthesizing findings…",
  "Almost there…",
]

const LOADING_MESSAGE_INTERVAL_MS = 2200

function useLoadingMessage(active: boolean) {
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (!active) return undefined

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % LOADING_MESSAGES.length)
    }, LOADING_MESSAGE_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [active])

  return LOADING_MESSAGES[index]
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 pl-0.5">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="size-1 animate-bounce rounded-full bg-current"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </span>
  )
}

export function MessageIdentity({ isUser }: { isUser: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? <User className="size-3" /> : <Bot className="size-3" />}
      </span>
      <span className="text-xs font-semibold text-muted-foreground">
        {isUser ? "You" : "Agent"}
      </span>
    </div>
  )
}

export function ThinkingSection({
  thoughts,
  seconds,
  defaultOpen = false,
  alwaysShow = false,
}: {
  thoughts: string[]
  seconds?: number
  defaultOpen?: boolean
  alwaysShow?: boolean
}) {
  const isLive = seconds === undefined
  const isWaitingForFirstThought = isLive && thoughts.length === 0
  const loadingMessage = useLoadingMessage(isWaitingForFirstThought)
  const latestThought = thoughts[thoughts.length - 1]
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // While live, auto-scroll the (capped-height) timeline to the newest
  // step instead of letting the whole page grow with every thought — a
  // long-running analysis can emit dozens of these.
  React.useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thoughts.length, isLive])

  if (!thoughts.length && !alwaysShow) return null

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="w-full min-w-0 max-w-[75%] px-1"
    >
      <CollapsibleTrigger className="group flex w-full min-w-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ChevronDownIcon className="size-3 shrink-0 transition-transform group-data-panel-open:rotate-180" />
        {seconds !== undefined ? (
          <span className="shrink-0">Thought for {seconds}s</span>
        ) : isWaitingForFirstThought ? (
          <span className="inline-flex shrink-0 items-center">
            {loadingMessage}
            <LoadingDots />
          </span>
        ) : (
          // Collapsed + live: show the latest step inline so the user
          // still gets a sense of progress without the full timeline
          // taking over the page. Expanded: just say "Thinking…" since
          // the latest step is already visible at the bottom of the list.
          <>
            <span className="min-w-0 flex-1 truncate text-left group-data-panel-open:hidden">
              {latestThought}
            </span>
            <span className="hidden shrink-0 group-data-panel-open:inline">
              Thinking…
            </span>
          </>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          ref={scrollRef}
          className="flex max-h-56 min-w-0 flex-col gap-3 overflow-y-auto pt-2 pr-1 pl-1"
        >
          {thoughts.map((thought, index) => (
            <div key={index} className="relative flex min-w-0 gap-2">
              {index < thoughts.length - 1 && (
                <span className="absolute top-4 left-1.75 h-full w-px bg-border" />
              )}
              <Clock className="relative z-10 mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 text-xs leading-relaxed wrap-break-word whitespace-pre-wrap text-muted-foreground">
                {thought}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

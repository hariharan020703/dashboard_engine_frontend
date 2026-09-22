import * as React from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/modules/data-analyst-agent/lib/utils"

export type MarkdownTextProps = {
  text: string
  className?: string
}

function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join("")
  if (React.isValidElement(node)) {
    return getNodeText((node.props as { children?: React.ReactNode }).children)
  }
  return ""
}

function isLabelNode(node: React.ReactNode): boolean {
  return (
    React.isValidElement(node) &&
    node.type === components.strong &&
    getNodeText(node).trim().endsWith(":")
  )
}

function hasRealContent(items: React.ReactNode[]): boolean {
  return items.some((item) => (typeof item === "string" ? item.trim().length > 0 : true))
}

type ParagraphSegment =
  | { kind: "heading"; node: React.ReactNode }
  | { kind: "body"; nodes: React.ReactNode[] }

function isSoleBoldNode(node: React.ReactNode): boolean {
  return React.isValidElement(node) && node.type === components.strong
}

function segmentLabeledParagraph(children: React.ReactNode): ParagraphSegment[] | null {
  const items = React.Children.toArray(children)

  if (items.length === 1 && isSoleBoldNode(items[0])) {
    return [{ kind: "heading", node: items[0] }]
  }
  if (!items.some(isLabelNode)) return null

  const segments: ParagraphSegment[] = []
  let body: React.ReactNode[] = []

  const flushBody = () => {
    if (hasRealContent(body)) segments.push({ kind: "body", nodes: body })
    body = []
  }

  for (const item of items) {
    if (isLabelNode(item)) {
      flushBody()
      segments.push({ kind: "heading", node: item })
    } else {
      body.push(item)
    }
  }
  flushBody()

  return segments
}

const HEADING_LINE_CLASS =
  "mt-3 mb-1 text-lg font-bold text-card-foreground first:mt-0"

const components: Components = {
  p: ({ children }) => {
    const segments = segmentLabeledParagraph(children)
    if (segments) {
      return (
        <>
          {segments.map((segment, index) =>
            segment.kind === "heading" ? (
              <p key={index} className={HEADING_LINE_CLASS}>
                {segment.node}
              </p>
            ) : (
              <p key={index} className="my-1 last:mb-0">
                {segment.nodes}
              </p>
            )
          )}
        </>
      )
    }

    return <p className="my-1 first:mt-0 last:mb-0">{children}</p>
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-link underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-secondary/30 px-1 py-0.5 font-mono text-[0.85em] text-card-foreground">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1 border-l-2 border-border pl-3 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-border" />,
  table: ({ children }) => (
    <div className="scrollbar-thin my-1 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b px-2 py-1 text-left font-semibold text-card-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b px-2 py-1">{children}</td>,
}

export function MarkdownText({ text, className }: MarkdownTextProps) {
  return (
    <div
      className={cn(
        "text-base leading-relaxed text-muted-foreground",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

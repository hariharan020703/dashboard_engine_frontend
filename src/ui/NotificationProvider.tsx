import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { NotificationContext } from './notificationContext'
import type { Notification, NotificationApi, NotificationTone } from './notificationContext'

const TONE_STYLE: Record<NotificationTone, { wrap: string; icon: typeof Info; iconCls: string }> = {
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    iconCls: 'text-emerald-600',
  },
  error: {
    wrap: 'border-red-200 bg-red-50 text-red-900',
    icon: XCircle,
    iconCls: 'text-red-600',
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: AlertTriangle,
    iconCls: 'text-amber-600',
  },
  info: {
    wrap: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: Info,
    iconCls: 'text-blue-600',
  },
}

const LIFETIME_MS: Record<NotificationTone, number | null> = {
  success: 4000,
  info: 4000,
  warning: 7000,
  error: null,
}

export default function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setItems((current) => current.filter((n) => n.id !== id))
  }, [])

  const push = useCallback(
    (tone: NotificationTone, message: string, detail?: string) => {
      const id = nextId.current++
      setItems((current) => {
        // Repeating an identical message stacks up noise rather than adding
        // information - a double-clicked button should read as one outcome.
        const withoutDuplicate = current.filter((n) => !(n.tone === tone && n.message === message))
        // Bounded so a loop of failures cannot bury the page.
        return [...withoutDuplicate, { id, tone, message, detail }].slice(-4)
      })

      const lifetime = LIFETIME_MS[tone]
      if (lifetime !== null) {
        timers.current.set(id, setTimeout(() => dismiss(id), lifetime))
      }
      return id
    },
    [dismiss]
  )

  const api = useMemo<NotificationApi>(
    () => ({
      success: (message, detail) => void push('success', message, detail),
      error: (message, detail) => void push('error', message, detail),
      warning: (message, detail) => void push('warning', message, detail),
      info: (message, detail) => void push('info', message, detail),
      pending: (message) => push('info', message),
      dismiss,
    }),
    [push, dismiss]
  )

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
        aria-live="polite"
      >
        {items.map((item) => {
          const style = TONE_STYLE[item.tone]
          const Icon = style.icon
          return (
            <div
              key={item.id}
              role={item.tone === 'error' ? 'alert' : 'status'}
              aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg ${style.wrap}`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${style.iconCls}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug">{item.message}</p>
                {item.detail && (
                  <p className="mt-0.5 text-[12px] leading-snug opacity-80">{item.detail}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-mr-1 shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}

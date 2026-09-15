import { useEffect, useState } from 'react'
import DashboardRenderer from './components/DashboardRenderer'
import { fetchView, patchCard } from './services/dashboardApi'
import { buildFilters } from './utils/filters'
import type { HydratedDashboardView, CardDefinition, Selections } from './types/dashboard'

export default function DashboardPage() {
  const [view, setView] = useState<HydratedDashboardView | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewLoading, setViewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<Selections>({})

  const syncSelections = (v: HydratedDashboardView) => {
    const sel: Selections = {}
    for (const s of v.slicers || []) {
      const selected = s.options.filter((o) => o.selected).map((o) => o.value)
      if (selected.length) sel[s.id] = new Set(selected)
    }
    setSelections(sel)
  }

  useEffect(() => {
    let active = true
    fetchView()
      .then((v) => {
        if (!active) return
        setView(v)
        syncSelections(v)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Failed to load dashboard')
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const loadView = async (filters: Record<string, string[]> = {}) => {
    setViewLoading(true)
    try {
      const v = await fetchView(filters)
      setView(v)
      syncSelections(v)
    } finally {
      setViewLoading(false)
    }
  }

  const onSlicerChange = (id: string, sel: Set<string>) => {
    setSelections((prev) => {
      const next = { ...prev, [id]: sel }
      loadView(buildFilters(next))
      return next
    })
  }

  const onClearAll = () => {
    setSelections({})
    loadView({})
  }

  const onCardEdit = async (index: number, card: CardDefinition) => {
    setViewLoading(true)
    try {
      const v = await patchCard(index, card, buildFilters(selections))
      setView(v)
      syncSelections(v)
    } finally {
      setViewLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-red-500">
        Error: {error}
      </div>
    )
  }

  if (!view) return null

  return (
    <div className="relative">
      {viewLoading && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-white/60 text-sm font-medium text-slate-500">
          Refreshing…
        </div>
      )}
      <DashboardRenderer
        view={view}
        selections={selections}
        onSlicerChange={onSlicerChange}
        onClearAll={onClearAll}
        onCardEdit={onCardEdit}
      />
    </div>
  )
}
import { Link } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { PageHeader, Panel } from '@/ui/page'

/**
 * Placeholder.
 *
 * The route and the sidebar entry exist so the feature has somewhere to land,
 * and this page says plainly that nothing is built yet rather than showing an
 * empty shell that reads as broken.
 */
export default function DataAnalystAgentPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Data Analyst Agent"
        description="Ask questions of the datasets you have brought in through the context layer."
      />
      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
            <Bot size={18} />
          </span>
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-800">Not built yet.</p>
            <p className="mt-1 text-[13px] leading-relaxed">
              This is where the agent will go. It will read the datasets selected in the{' '}
              <Link to="/context" className="font-medium text-blue-700 hover:underline">
                Context Layer
              </Link>
              , so connecting a warehouse and choosing datasets there is the useful thing to do
              first.
            </p>
            <p className="mt-2 text-[12px] text-slate-400">
              Nothing on this page calls a model or reads any data.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  )
}

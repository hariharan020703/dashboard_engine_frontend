import { useState } from 'react'
import { Database, Hash, Tags } from 'lucide-react'
import { fetchColumns } from '@/api/dashboardApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { StatCard } from '@/components/common/StatCard'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ColumnCatalogue } from '@/types/dashboard'

type CatalogueColumn = ColumnCatalogue['columns'][number]

/**
 * What is in the data behind a dashboard.
 *
 * Two audiences, one screen, and the difference is real rather than cosmetic. A
 * customer wants to know what they can chart and what they can filter by, in
 * those words. A platform administrator is often here because something is
 * wrong, and needs the database, schema and table the spec resolved to.
 *
 * So the technical properties - the qualified table name, nullability - are
 * shown only in the platform console. A customer never needed them, and
 * printing a schema name on their screen is a small leak of how the product is
 * built for no benefit to them.
 */
export default function DataPage() {
  const { dashboards } = useAuth()
  const paths = usePaths()
  const isPlatform = paths.shell === 'platform'

  const available = dashboards
  const [picked, setPicked] = useState('')
  const dashboardId = picked || available[0]?.id || ''

  const catalogue = useAsync(
    () => (dashboardId ? fetchColumns(dashboardId) : Promise.resolve(null)),
    [dashboardId]
  )

  const [filter, setFilter] = useState<'all' | 'measures' | 'dimensions'>('all')

  const columns = catalogue.data?.columns ?? []
  const measures = columns.filter((column) => column.role === 'measure')
  const dimensions = columns.filter((column) => column.role !== 'measure')
  const shown =
    filter === 'measures' ? measures : filter === 'dimensions' ? dimensions : columns

  const tableColumns: ColumnDef<CatalogueColumn>[] = [
    {
      key: 'name',
      header: 'Field',
      sortValue: (column) => column.name.toLowerCase(),
      render: (column) => <span className="font-medium text-foreground">{column.name}</span>,
    },
    {
      key: 'role',
      header: 'Kind',
      width: 'w-36',
      sortValue: (column) => column.role,
      render: (column) =>
        column.role === 'measure' ? (
          <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
            Measure
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Category
          </Badge>
        ),
    },
    {
      key: 'use',
      header: 'What it is for',
      secondary: true,
      render: (column) => (
        <span className="text-sm text-muted-foreground">
          {column.role === 'measure'
            ? 'A number you can total, average or chart.'
            : 'A label you can group by or filter on.'}
        </span>
      ),
    },
    ...(isPlatform
      ? [
          {
            key: 'type',
            header: 'Type',
            width: 'w-36',
            secondary: true,
            sortValue: (column: CatalogueColumn) => column.columnType,
            render: (column: CatalogueColumn) => (
              <code className="text-xs text-muted-foreground">{column.columnType}</code>
            ),
          } satisfies ColumnDef<CatalogueColumn>,
          {
            key: 'nullable',
            header: 'Nullable',
            width: 'w-24',
            secondary: true,
            sortValue: (column: CatalogueColumn) => (column.nullable ? 1 : 0),
            render: (column: CatalogueColumn) => (
              <span className="text-sm text-muted-foreground">
                {column.nullable ? 'Yes' : 'No'}
              </span>
            ),
          } satisfies ColumnDef<CatalogueColumn>,
        ]
      : []),
  ]

  if (available.length === 0) {
    return (
      <Page>
        <PageHeader title={isPlatform ? 'Data sources' : 'Data'} />
        <Section flush>
          <EmptyState
            title="Nothing to explore yet"
            icon={Database}
            body={
              isPlatform
                ? 'A platform account holds no dashboard grants of its own. Grant yourself a dashboard inside a company, or inspect a customer’s data through their company page.'
                : 'This page describes the data behind your dashboards. You have not been given one yet.'
            }
          />
        </Section>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title={isPlatform ? 'Data sources' : 'Data'}
        description={
          isPlatform
            ? 'The table behind each dashboard, and every column in it.'
            : 'What you can measure and group by in your dashboards.'
        }
        actions={
          available.length > 1 && (
            <div className="w-64 space-y-1.5">
              <Label htmlFor="data-dashboard" className="text-xs font-medium">
                Dashboard
              </Label>
              <Select value={dashboardId} onValueChange={setPicked}>
                <SelectTrigger id="data-dashboard" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {available.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      {dashboard.title || dashboard.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }
      />

      {catalogue.error ? (
        <Section>
          <ErrorState
            error={catalogue.error}
            title="Unable to read this dashboard's data"
            onRetry={catalogue.reload}
          />
        </Section>
      ) : catalogue.loading || !catalogue.data ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Measures" value={measures.length} icon={Hash} />
            <StatCard label="Categories" value={dimensions.length} icon={Tags} />
            <StatCard
              label="Rows"
              value={catalogue.data.rowCount}
              icon={Database}
              hint="In the source table right now."
            />
          </div>

          {/* Only the console gets the qualified table name. */}
          {isPlatform && (
            <Section title="Source">
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Database</dt>
                  <dd className="mt-1">
                    <code className="text-sm text-foreground">{catalogue.data.database}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Table</dt>
                  <dd className="mt-1">
                    <code className="text-sm text-foreground">
                      {catalogue.data.schema}.{catalogue.data.table}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Columns</dt>
                  <dd className="mt-1 tabular-nums text-foreground">
                    {catalogue.data.columns.length}
                  </dd>
                </div>
              </dl>
            </Section>
          )}

          <Section
            title="Fields"
            description="What each field lets you do in a chart or a filter."
            actions={
              <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
                <TabsList>
                  <TabsTrigger value="all">All {columns.length}</TabsTrigger>
                  <TabsTrigger value="measures">Measures {measures.length}</TabsTrigger>
                  <TabsTrigger value="dimensions">Categories {dimensions.length}</TabsTrigger>
                </TabsList>
              </Tabs>
            }
            flush
          >
            <DataTable
              data={shown}
              columns={tableColumns}
              keyOf={(column) => column.name}
              searchPlaceholder="Search fields…"
              searchFilter={(column, query) => column.name.toLowerCase().includes(query)}
              empty={{
                title: 'No fields',
                body: 'This dashboard’s source table reports no columns of that kind.',
              }}
              pageSize={25}
            />
          </Section>
        </div>
      )}
    </Page>
  )
}

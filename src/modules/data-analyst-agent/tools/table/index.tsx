import * as React from "react"
import {
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
} from "lucide-react"

import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { Button } from "@/modules/data-analyst-agent/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/data-analyst-agent/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/data-analyst-agent/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/modules/data-analyst-agent/ui/tooltip"
import { tableFeatureSet, type GenericTableFeatures } from "@/modules/data-analyst-agent/tools/table/features"
import {
  exportTableAsCsv,
  exportTableAsExcel,
  slugifyFilename,
  type ExportColumn,
} from "@/modules/data-analyst-agent/lib/export-table"

export { tableFeatureSet, type GenericTableFeatures }

const ACTIONS_COLUMN_ID = "actions"
const COLUMN_MIN_WIDTH = 160
const COLUMN_MAX_WIDTH = 280
const ACTIONS_COLUMN_WIDTH = 88

function getColumnWidthStyle(columnId: string): React.CSSProperties {
  if (columnId === ACTIONS_COLUMN_ID) {
    return { width: ACTIONS_COLUMN_WIDTH, minWidth: ACTIONS_COLUMN_WIDTH }
  }
  return { minWidth: COLUMN_MIN_WIDTH, maxWidth: COLUMN_MAX_WIDTH }
}

export type GenericTableColumn<TData extends RowData> = ColumnDef<
  GenericTableFeatures,
  TData
>

export type DataTableProps<TData extends RowData> = {
  columns: GenericTableColumn<TData>[]
  rows: TData[]
  title?: string
  pageSize?: number
  emptyMessage?: string
  className?: string
  enableColumnFilter?: boolean
  enableExport?: boolean
  exportFileName?: string
  onRowClick?: (row: TData) => void
}

export function DataTable<TData extends RowData>({
  columns,
  rows,
  title,
  pageSize = 10,
  emptyMessage = "No results.",
  className,
  enableColumnFilter = true,
  enableExport = true,
  exportFileName = "table",
  onRowClick,
}: DataTableProps<TData>) {
  const [isExporting, setIsExporting] = React.useState(false)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})

  const table = useTable({
    features: tableFeatureSet,
    data: rows,
    columns,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, pagination, columnVisibility },
  })

  const getExportColumns = (): ExportColumn[] =>
    table
      .getAllLeafColumns()
      .filter((column) => column.getIsVisible() && column.accessorFn)
      .map((column) => ({
        key: column.id,
        header:
          typeof column.columnDef.header === "string"
            ? column.columnDef.header
            : column.id,
      }))

  const handleExportCsv = () => {
    exportTableAsCsv(
      slugifyFilename(exportFileName),
      getExportColumns(),
      rows as Record<string, unknown>[]
    )
  }

  const handleExportExcel = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      await exportTableAsExcel(
        slugifyFilename(exportFileName),
        getExportColumns(),
        rows as Record<string, unknown>[]
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {(title || enableColumnFilter || enableExport) && (
        <div className="flex items-center justify-between gap-2 pb-3">
          {title && (
            <p className="text-sm font-semibold text-card-foreground">
              {title}
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {enableColumnFilter && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="default"
                      size="sm"
                      className="cursor-pointer gap-1.5 shadow-sm"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      Columns
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {table
                      .getAllLeafColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        const header = column.columnDef.header
                        const label =
                          typeof header === "string" ? header : column.id

                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            checked={column.getIsVisible()}
                            onCheckedChange={(checked) =>
                              column.toggleVisibility(checked)
                            }
                          >
                            {label}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {enableExport && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1.5 border-link text-link shadow-sm hover:bg-link/10 hover:text-link"
                      disabled={isExporting}
                    >
                      <Download className="size-3.5" />
                      {isExporting ? "Exporting…" : "Export"}
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Export table</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportCsv}>
                      <FileText className="size-3.5" />
                      CSV (.csv)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel}>
                      <FileSpreadsheet className="size-3.5" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}
      <div className="scrollbar-thin overflow-x-auto overflow-hidden rounded-none">
        <Table className="table-fixed">
          <TableHeader
            className="[&_th]:text-white"
            style={{ backgroundColor: "var(--sidebar)" }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <TableHead
                      key={header.id}
                      className="truncate text-xs font-bold tracking-wide uppercase"
                      style={getColumnWidthStyle(header.column.id)}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 max-w-full cursor-pointer gap-1.5 text-white hover:bg-transparent hover:text-white"
                          onClick={() =>
                            header.column.toggleSorting(sorted === "asc")
                          }
                        >
                          <span className="min-w-0 truncate">
                            <table.FlexRender header={header} />
                          </span>
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5 shrink-0" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5 shrink-0" />
                          ) : (
                            <ArrowUpDown className="size-3.5 shrink-0 text-white" />
                          )}
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-primary/5"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isDataColumn = Boolean(cell.column.accessorFn)
                    const cellText = isDataColumn
                      ? String(cell.getValue() ?? "")
                      : null

                    return (
                      <TableCell
                        key={cell.id}
                        className="cursor-default"
                        style={getColumnWidthStyle(cell.column.id)}
                      >
                        {isDataColumn ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="block cursor-default truncate">
                                  {cellText}
                                </span>
                              }
                            />
                            <TooltipContent>{cellText}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <table.FlexRender cell={cell} />
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4 pb-1">
          <span className="mr-auto text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{pagination.pageIndex + 1}</span> of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}


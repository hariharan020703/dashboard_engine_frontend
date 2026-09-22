import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { listCompanies } from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/app/usePaths'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { ActiveBadge } from '@/components/common/Badges'
import { CompanyAvatar } from '@/components/common/CompanyAvatar'
import { Button } from '@/components/ui/button'
import { CompanyOnboardingDialog } from '@/components/onboarding/CompanyOnboardingDialog'
import type { Company } from '@/types/admin'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The customer directory.
 *
 * A row is a summary and a way in; everything you can do TO a company lives on
 * its own page. That is the change from the old screen, which put deletion and
 * dashboard assignment in a row's overflow menu - so the most destructive action
 * in the product was two clicks from a list, with nothing on screen saying how
 * many people it would affect.
 */
export default function CompaniesPage() {
  const { can } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  const [onboarding, setOnboarding] = useState(false)

  const companies = useAsync(() => listCompanies(), [])

  const openCompany = (company: Company) => {
    const path = paths.company(company.id)
    if (path) navigate(path)
  }

  const columns: ColumnDef<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      sortValue: (company) => company.name.toLowerCase(),
      render: (company) => (
        <div className="flex items-center gap-2.5">
          <CompanyAvatar name={company.name} size="md" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{company.name}</p>
            <p className="truncate text-xs text-muted-foreground">{company.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-32',
      sortValue: (company) => (company.active ? 1 : 0),
      render: (company) => <ActiveBadge active={company.active} />,
    },
    {
      key: 'users',
      header: 'People',
      align: 'right',
      width: 'w-24',
      secondary: true,
      sortValue: (company) => company.userCount ?? 0,
      render: (company) => (
        <span className="tabular-nums">{(company.userCount ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'dashboards',
      header: 'Dashboards',
      align: 'right',
      width: 'w-28',
      secondary: true,
      sortValue: (company) => company.dashboardCount ?? 0,
      render: (company) => (
        <span className="tabular-nums">{(company.dashboardCount ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'created',
      header: 'Onboarded',
      width: 'w-36',
      secondary: true,
      sortValue: (company) => company.createdAt ?? '',
      render: (company) => (
        <span className="text-muted-foreground">{formatDate(company.createdAt)}</span>
      ),
    },
  ]

  const canCreate = can('company.create')

  return (
    <Page>
      <PageHeader
        title="Companies"
        description="Every customer on the platform."
        actions={
          canCreate && (
            <Button onClick={() => setOnboarding(true)}>
              <Plus aria-hidden />
              Onboard a company
            </Button>
          )
        }
      />

      <Section flush>
        <DataTable
          data={companies.data}
          columns={columns}
          keyOf={(company) => company.id}
          loading={companies.loading}
          error={companies.error}
          onRetry={companies.reload}
          onRowClick={openCompany}
          searchPlaceholder="Search companies…"
          searchFilter={(company, query) =>
            company.name.toLowerCase().includes(query) ||
            company.slug.toLowerCase().includes(query)
          }
          empty={{
            title: 'No customers yet',
            body: canCreate
              ? 'Onboard your first customer company. You create it and its administrator together, and they are invited by email.'
              : 'No companies have been onboarded yet.',
            action: canCreate ? (
              <Button onClick={() => setOnboarding(true)}>
                <Plus aria-hidden />
                Onboard a company
              </Button>
            ) : undefined,
          }}
        />
      </Section>

      <CompanyOnboardingDialog
        open={onboarding}
        onOpenChange={setOnboarding}
        onCreated={companies.reload}
      />
    </Page>
  )
}


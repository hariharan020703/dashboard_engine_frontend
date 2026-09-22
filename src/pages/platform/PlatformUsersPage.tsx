import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  activateUser,
  deactivateUser,
  deleteUser,
  listCompanies,
  listUsers,
  resendActivation,
} from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { PeopleDirectory } from '@/components/people/PeopleDirectory'
import { UserOnboardingDialog } from '@/components/onboarding/UserOnboardingDialog'
import { Button } from '@/components/ui/button'

/**
 * Every account on the platform, across every customer.
 *
 * The one screen in the product that legitimately crosses the tenant boundary,
 * and it is reachable only from the platform console - /api/platform/users is
 * gated on the role's scope, so a company administrator following this URL is
 * refused by the server rather than merely not shown the link.
 */
export default function PlatformUsersPage() {
  const { can } = useAuth()
  const [adding, setAdding] = useState(false)
  const [companyFilter, setCompanyFilter] = useState<number | null>(null)

  const people = useAsync(
    () => listUsers(companyFilter ?? undefined),
    [companyFilter]
  )
  const companies = useAsync(() => listCompanies(), [])

  const canCreate = can('user.create')

  return (
    <Page>
      <PageHeader
        title="Users"
        description="Every account across every customer company."
        actions={
          canCreate && (
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              Add a person
            </Button>
          )
        }
      />

      <Section flush>
        <PeopleDirectory
          people={people.data}
          loading={people.loading}
          error={people.error}
          onRetry={people.reload}
          onChanged={people.reload}
          showCompany
          companies={companies.data ?? undefined}
          companyFilter={companyFilter}
          onCompanyFilterChange={setCompanyFilter}
          actions={{
            activate: (user) => activateUser(user.id),
            deactivate: (user) => deactivateUser(user.id),
            resendInvitation: (user) => resendActivation(user.id),
            remove: (user) => deleteUser(user.id),
          }}
          empty={{
            title: companyFilter ? 'Nobody in this company' : 'No accounts yet',
            body: companyFilter
              ? 'This customer has no accounts. Add their first person, or clear the filter to see everyone.'
              : 'Accounts appear here once customers are onboarded.',
            action: canCreate ? (
              <Button onClick={() => setAdding(true)}>
                <Plus aria-hidden />
                Add a person
              </Button>
            ) : undefined,
          }}
        />
      </Section>

      <UserOnboardingDialog
        open={adding}
        onOpenChange={setAdding}
        onCreated={people.reload}
        companies={companies.data ?? []}
      />
    </Page>
  )
}

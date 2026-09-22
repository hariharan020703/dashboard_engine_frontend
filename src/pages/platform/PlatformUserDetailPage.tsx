import { useParams } from 'react-router-dom'
import {
  activateUser,
  deactivateUser,
  fetchUser,
  resendActivation,
  updateUser,
} from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/app/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { PersonDetail } from '@/components/people/PersonDetail'
import { RoleBadge, StatusBadge } from '@/components/common/Badges'
import { CardGridSkeleton, ErrorState, NotFoundState } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'

/** One account, seen from the platform console - any customer's, or a platform one. */
export default function PlatformUserDetailPage() {
  const { userId: userIdParam } = useParams()
  const userId = Number(userIdParam)
  const paths = usePaths()

  const valid = Number.isInteger(userId) && userId > 0
  const person = useAsync(
    () => (valid ? fetchUser(userId) : Promise.reject(new Error('invalid id'))),
    [userId, valid]
  )

  if (!valid) {
    return (
      <Page>
        <NotFoundState detail="That is not a valid account address." backTo={paths.users} />
      </Page>
    )
  }

  if (person.error) {
    return (
      <Page>
        <PageHeader
          title="Account"
          crumbs={[{ label: 'Users', to: paths.users }, { label: 'Not available' }]}
        />
        <Section>
          <ErrorState error={person.error} title="Unable to load this account" onRetry={person.reload} />
        </Section>
      </Page>
    )
  }

  if (person.loading || !person.data) {
    return (
      <Page>
        <PageHeader title="Loading account…" />
        <CardGridSkeleton count={2} />
      </Page>
    )
  }

  const record = person.data

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Users', to: paths.users }, { label: record.username }]}
        title={record.displayName || record.username}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadge role={record.role} />
            <StatusBadge status={record.status} />
            <span className="text-xs">{record.email}</span>
            {record.companyName ? (
              <Badge variant="outline">{record.companyName}</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Platform account
              </Badge>
            )}
          </span>
        }
      />

      <PersonDetail
        person={record}
        onChanged={person.reload}
        actions={{
          updateRole: (role) => updateUser(record.id, { role }),
          activate: () => activateUser(record.id),
          deactivate: () => deactivateUser(record.id),
          resendInvitation: () => resendActivation(record.id),
        }}
      />
    </Page>
  )
}

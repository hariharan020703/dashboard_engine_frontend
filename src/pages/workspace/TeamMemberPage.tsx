import { useParams } from 'react-router-dom'
import {
  activateTeamMember,
  deactivateTeamMember,
  fetchTeamMember,
  resendTeamActivation,
  updateTeamMember,
} from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/app/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { PersonDetail } from '@/components/people/PersonDetail'
import { RoleBadge, StatusBadge } from '@/components/common/Badges'
import { CardGridSkeleton, ErrorState, NotFoundState } from '@/components/common/States'

/**
 * One colleague.
 *
 * Reached through /api/users, which narrows by the caller's company in SQL - so
 * a member id belonging to another company is a 404 here, not a 403 with a
 * hint. Changing the number in the address reveals nothing, including whether
 * that account exists.
 */
export default function TeamMemberPage() {
  const { userId: userIdParam } = useParams()
  const userId = Number(userIdParam)
  const paths = usePaths()

  const valid = Number.isInteger(userId) && userId > 0
  const person = useAsync(
    () => (valid ? fetchTeamMember(userId) : Promise.reject(new Error('invalid id'))),
    [userId, valid]
  )

  if (!valid) {
    return (
      <Page>
        <NotFoundState detail="That is not a valid member address." backTo={paths.users} />
      </Page>
    )
  }

  if (person.error) {
    return (
      <Page>
        <PageHeader
          title="Member"
          crumbs={[{ label: 'Members', to: paths.users }, { label: 'Not available' }]}
        />
        <Section>
          <ErrorState error={person.error} title="Unable to load this member" onRetry={person.reload} />
        </Section>
      </Page>
    )
  }

  if (person.loading || !person.data) {
    return (
      <Page>
        <PageHeader title="Loading member…" />
        <CardGridSkeleton count={2} />
      </Page>
    )
  }

  const record = person.data

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Members', to: paths.users }, { label: record.username }]}
        title={record.displayName || record.username}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadge role={record.role} />
            <StatusBadge status={record.status} />
            <span className="text-xs">{record.email}</span>
          </span>
        }
      />

      <PersonDetail
        person={record}
        onChanged={person.reload}
        actions={{
          updateRole: (role) => updateTeamMember(record.id, { role }),
          activate: () => activateTeamMember(record.id),
          deactivate: () => deactivateTeamMember(record.id),
          resendInvitation: () => resendTeamActivation(record.id),
        }}
      />
    </Page>
  )
}

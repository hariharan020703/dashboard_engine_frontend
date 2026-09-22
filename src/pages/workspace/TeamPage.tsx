import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  activateTeamMember,
  deactivateTeamMember,
  deleteTeamMember,
  listTeam,
  resendTeamActivation,
} from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { PeopleDirectory } from '@/components/people/PeopleDirectory'
import { UserOnboardingDialog } from '@/components/onboarding/UserOnboardingDialog'
import { Button } from '@/components/ui/button'

/**
 * The company's own people.
 *
 * Every call here goes to /api/users, where the server reads the company off
 * the session. There is no company id in any request this screen makes, which
 * is the strongest form the tenant rule can take: there is nothing to tamper
 * with, because there is nowhere to name another company.
 */
export default function TeamPage() {
  const { can, user } = useAuth()
  const [adding, setAdding] = useState(false)

  const team = useAsync(() => listTeam(), [])
  const canCreate = can('user.create')

  return (
    <Page>
      <PageHeader
        title="Members"
        description={
          user?.companyName
            ? `Everyone at ${user.companyName}.`
            : 'Everyone in your company.'
        }
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
          people={team.data}
          loading={team.loading}
          error={team.error}
          onRetry={team.reload}
          onChanged={team.reload}
          actions={{
            activate: (member) => activateTeamMember(member.id),
            deactivate: (member) => deactivateTeamMember(member.id),
            resendInvitation: (member) => resendTeamActivation(member.id),
            remove: (member) => deleteTeamMember(member.id),
          }}
          empty={{
            title: 'No colleagues yet',
            body: canCreate
              ? 'Add your first colleague. They receive an email with a link to set their own password — you never handle a password for them.'
              : 'Nobody else has been added to this company yet.',
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
        onCreated={team.reload}
        fixedCompanyName={user?.companyName ?? null}
      />
    </Page>
  )
}

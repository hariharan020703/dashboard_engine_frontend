import { useCallback, useEffect, useState } from 'react'
import {
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  fetchDashboardGrants,
  grantGroupAccess,
  grantUserAccess,
  listGrantableDashboards,
  listGroups,
  listUserOptions,
  revokeGroupAccess,
  revokeUserAccess,
} from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import Modal from '@/ui/Modal'
import { useNotification } from '@/ui/notificationContext'
import { EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import {
  actionDangerCls,
  actionPrimaryCls,
  ghostButtonCls,
  labelCls,
  selectCls,
} from '@/ui/styles'
import type { DashboardGrants, DashboardSummary, Group, UserOption } from '@/types/admin'
import type { AccessLevel } from '@/types/auth'

export default function AccessMatrixPage() {
  const notify = useNotification()
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([])
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>('')
  const [grants, setGrants] = useState<DashboardGrants | null>(null)
  const [loading, setLoading] = useState(true)
  const [grantsLoading, setGrantsLoading] = useState(false)

  // Grant dialog
  const [granting, setGranting] = useState(false)
  const [grantType, setGrantType] = useState<'user' | 'group'>('user')
  const [users, setUsers] = useState<UserOption[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [targetId, setTargetId] = useState<number | ''>('')
  const [targetLevel, setTargetLevel] = useState<AccessLevel>('view')
  const [submitting, setSubmitting] = useState(false)

  // Load available dashboards
  useEffect(() => {
    let active = true
    listGrantableDashboards()
      .then((data) => {
        if (!active) return
        setDashboards(data)
        if (data.length > 0) {
          setSelectedDashboardId(data[0].id)
        }
      })
      .catch((err) => {
        notify.error('Could not load grantable dashboards.', errorMessage(err, ''))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [notify])

  const [reloadGrantsToken, setReloadGrantsToken] = useState(0)
  const reloadGrants = useCallback(() => {
    setGrantsLoading(true)
    setReloadGrantsToken((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!selectedDashboardId) return
    let cancelled = false
    const run = async () => {
      try {
        const data = await fetchDashboardGrants(selectedDashboardId)
        if (cancelled) return
        setGrants(data)
      } catch (err) {
        if (cancelled) return
        notify.error('Could not load dashboard grants.', errorMessage(err, ''))
      } finally {
        if (!cancelled) setGrantsLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [selectedDashboardId, reloadGrantsToken, notify])

  // Open grant modal
  const handleOpenGrantModal = async () => {
    setGranting(true)
    setTargetId('')
    setTargetLevel('view')
    try {
      const [uList, gList] = await Promise.all([listUserOptions(), listGroups()])
      setUsers(uList)
      setGroups(gList)
      if (uList.length > 0) setTargetId(uList[0].id)
    } catch (err) {
      notify.error('Could not load team users or groups.', errorMessage(err, ''))
    }
  }

  const handleSaveGrant = async () => {
    if (!targetId || !selectedDashboardId) return
    setSubmitting(true)
    try {
      if (grantType === 'user') {
        await grantUserAccess(selectedDashboardId, Number(targetId), targetLevel)
        notify.success('User dashboard access granted.')
      } else {
        await grantGroupAccess(selectedDashboardId, Number(targetId), targetLevel)
        notify.success('Group dashboard access granted.')
      }
      setGranting(false)
      reloadGrants()
    } catch (err) {
      notify.error('Could not save dashboard access.', errorMessage(err, ''))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevokeUser = async (userId: number) => {
    try {
      await revokeUserAccess(selectedDashboardId, userId)
      notify.success('User access revoked.')
      reloadGrants()
    } catch (err) {
      notify.error('Failed to revoke access.', errorMessage(err, ''))
    }
  }

  const handleRevokeGroup = async (groupId: number) => {
    try {
      await revokeGroupAccess(selectedDashboardId, groupId)
      notify.success('Group access revoked.')
      reloadGrants()
    } catch (err) {
      notify.error('Failed to revoke access.', errorMessage(err, ''))
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loading label="Loading access matrix…" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard Access Management"
        description="Allocate and audit which team members and groups can view or edit company dashboards."
        actions={
          dashboards.length > 0 && (
            <button
              type="button"
              onClick={() => void handleOpenGrantModal()}
              className={actionPrimaryCls}
            >
              <Plus size={14} />
              Grant Access
            </button>
          )
        }
      />

      {dashboards.length === 0 ? (
        <Panel flush>
          <EmptyState
            message="No dashboards assigned to your company."
            hint="Your platform administrator assigns which dashboards your organization may use."
          />
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <Panel title="Select Dashboard" flush>
            <div className="divide-y divide-slate-100">
              {dashboards.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDashboardId(d.id)}
                  className={`flex w-full items-center justify-between p-3.5 text-left text-xs transition-colors ${
                    selectedDashboardId === d.id
                      ? 'bg-blue-50/70 font-semibold text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{d.title || d.id}</span>
                  <ChevronRight size={13} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </Panel>

          {/* Grants Matrix Detail */}
          <div className="space-y-6">
            {grantsLoading ? (
              <Panel flush>
                <Loading label="Loading access permissions…" />
              </Panel>
            ) : (
              <>
                {/* User Grants */}
                <Panel
                  title="Direct User Grants"
                  description="Individual team members holding access to this dashboard."
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        setGrantType('user')
                        void handleOpenGrantModal()
                      }}
                      className={actionPrimaryCls}
                    >
                      <Plus size={12} />
                      Grant User
                    </button>
                  }
                  flush
                >
                  {!grants?.users.length ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No direct user grants on this dashboard yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {grants.users.map((u) => (
                        <div
                          key={u.userId}
                          className="flex items-center justify-between p-3.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{u.username}</span>
                            <span className="ml-2 font-mono text-slate-400">{u.email}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <AccessLevelBadge level={u.level} />
                            <button
                              type="button"
                              onClick={() => void handleRevokeUser(u.userId)}
                              className={actionDangerCls}
                              title="Revoke access"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                {/* Group Grants */}
                <Panel
                  title="Inherited Group Grants"
                  description="Functional teams carrying access for all of their active members."
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        setGrantType('group')
                        void handleOpenGrantModal()
                      }}
                      className={actionPrimaryCls}
                    >
                      <Plus size={12} />
                      Grant Group
                    </button>
                  }
                  flush
                >
                  {!grants?.groups.length ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No groups granted access to this dashboard yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {grants.groups.map((g) => (
                        <div
                          key={g.groupId}
                          className="flex items-center justify-between p-3.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{g.groupName}</span>
                            {!g.active && (
                              <span className="ml-2 text-[10px] text-red-500 font-semibold">
                                (inactive group)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <AccessLevelBadge level={g.level} />
                            <button
                              type="button"
                              onClick={() => void handleRevokeGroup(g.groupId)}
                              className={actionDangerCls}
                              title="Revoke group access"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {granting && (
        <Modal title="Grant Dashboard Access" onClose={() => setGranting(false)} width="max-w-md">
          <div className="space-y-4 text-xs">
            <div>
              <label className={labelCls}>Grant Subject</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGrantType('user')
                    if (users.length > 0) setTargetId(users[0].id)
                  }}
                  className={`flex-1 rounded-lg border py-2 text-center font-semibold transition-colors ${
                    grantType === 'user'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Team Member (User)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGrantType('group')
                    if (groups.length > 0) setTargetId(groups[0].id)
                  }}
                  className={`flex-1 rounded-lg border py-2 text-center font-semibold transition-colors ${
                    grantType === 'group'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Group / Team
                </button>
              </div>
            </div>

            {grantType === 'user' ? (
              <div>
                <label htmlFor="grant-target-user" className={labelCls}>
                  Select User
                </label>
                <select
                  id="grant-target-user"
                  value={targetId}
                  onChange={(e) => setTargetId(Number(e.target.value))}
                  className={selectCls}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="grant-target-group" className={labelCls}>
                  Select Group
                </label>
                <select
                  id="grant-target-group"
                  value={targetId}
                  onChange={(e) => setTargetId(Number(e.target.value))}
                  className={selectCls}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.memberCount} members)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="grant-access-level" className={labelCls}>
                Access Level
              </label>
              <select
                id="grant-access-level"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value as AccessLevel)}
                className={selectCls}
              >
                <option value="view">View (Interact with slicers & view data)</option>
                <option value="share">Share (View + grant other company users)</option>
                <option value="developer">Developer (Share + customize card specs)</option>
                <option value="admin">Admin (Full administrative control)</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGranting(false)}
                className={ghostButtonCls}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetId || submitting}
                onClick={() => void handleSaveGrant()}
                className={actionPrimaryCls}
              >
                {submitting ? 'Granting…' : 'Save Access'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

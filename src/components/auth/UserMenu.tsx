import { useEffect, useRef, useState } from 'react'
import { KeyRound, LogOut, ShieldCheck, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import ChangePasswordForm from './ChangePasswordForm'
import Modal from '@/ui/Modal'
import RoleBadge from '@/components/rbac/RoleBadge'

/**
 * Who is signed in, and what they can do about it.
 *
 * Rendered in the application header. Reads the session from context rather
 * than taking props, so placing it costs the shell one line and no knowledge of
 * auth.
 */
export default function UserMenu() {
  const { user, dashboards, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [changing, setChanging] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on an outside click or Escape - the dropdown covers the page.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const itemCls =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50'

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-500">
            <User size={14} />
          </span>
          <span className="max-w-[10rem] truncate font-medium">
            {user.displayName || user.username}
          </span>
          <RoleBadge role={user.role} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <div className="border-b border-slate-100 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-slate-800">{user.username}</p>
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <ShieldCheck size={11} />
                {user.permissions.length} permission{user.permissions.length === 1 ? '' : 's'}
                {' · '}
                {dashboards.length} dashboard{dashboards.length === 1 ? '' : 's'}
              </p>
            </div>

            <Link to="/profile" role="menuitem" className={itemCls} onClick={() => setOpen(false)}>
              <User size={14} className="text-slate-400" />
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setChanging(true)
              }}
              className={itemCls}
            >
              <KeyRound size={14} className="text-slate-400" />
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </div>

      {changing && (
        <Modal title="Change password" onClose={() => setChanging(false)} width="max-w-sm">
          {/*
            The form reports its own outcome through the notification system, so
            the dialog simply closes - there is no second confirmation step to
            dismiss, and no in-place success message that duplicates the toast.
          */}
          <ChangePasswordForm
            onDone={() => setChanging(false)}
            onCancel={() => setChanging(false)}
          />
        </Modal>
      )}
    </>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useSession } from '@/hooks/useSession'
import { useSidebar } from '@/hooks/useSidebar'
import { supabase } from '@/services/supabaseClient'
import { Sidebar, SidebarNav } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const { t } = useTranslation()
  const { displayName } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const sidebar = useSidebar()

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar collapsed={sidebar.collapsed} onToggleCollapse={sidebar.toggle} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onOpenMenu={() => setMenuOpen(true)} />

        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          className="inset-y-0 start-0 end-auto flex w-[260px] flex-col border-e border-s-0 border-border bg-card p-0 text-foreground data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          aria-describedby={undefined}
        >
          <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
            <SheetTitle asChild>
              <div className="flex min-w-0 flex-col">
                <BrandLockup size="sm" />
              </div>
            </SheetTitle>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="mt-auto border-t border-border p-3">
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false)
                try {
                  await supabase.auth.signOut()
                  toast.success(t('sidebar.signedOut', 'Signed out successfully'))
                } catch {
                  toast.error(t('common.errorTitle', 'Error signing out'))
                }
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="size-4 text-red-500" />
              <span>{t('sidebar.signOut', 'Log out')}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

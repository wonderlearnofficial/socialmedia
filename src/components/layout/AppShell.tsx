import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Sidebar, SidebarNav } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

export function AppShell() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMenuOpen(true)}
            aria-label={t('common.openMenu')}
          >
            <Menu />
          </Button>
          <BrandLockup size="sm" />
          <div className="ms-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          className="inset-y-0 start-0 end-auto w-64 border-e border-s-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          aria-describedby={undefined}
        >
          <div className="flex h-14 items-center border-b px-4">
            <SheetTitle asChild>
              <BrandLockup size="sm" />
            </SheetTitle>
          </div>
          <div className="border-b p-3">
            <WorkspaceSwitcher />
          </div>
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

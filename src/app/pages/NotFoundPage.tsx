import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <EmptyState
        icon={Compass}
        title={t('common.notFoundTitle')}
        body={t('common.notFoundBody')}
        action={
          <Link to="/" className={buttonVariants({ size: 'sm' })}>
            {t('common.goHome')}
          </Link>
        }
      />
    </div>
  )
}

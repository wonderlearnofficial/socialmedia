import { Skeleton } from '@/components/ui/skeleton'

export function RouteFallback() {
  return (
    <div className="space-y-4 p-4 sm:p-5 lg:p-6" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-[60vh] rounded-xl" />
    </div>
  )
}

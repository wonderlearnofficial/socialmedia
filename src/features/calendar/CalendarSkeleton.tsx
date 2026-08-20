import { Skeleton } from '@/components/ui/skeleton'

export function CalendarSkeleton() {
  return (
    <div className="p-4" aria-busy="true">
      <div className="mb-2 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" style={{ opacity: 1 - (i % 7) * 0.06 }} />
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-xl" />
      ))}
    </div>
  )
}

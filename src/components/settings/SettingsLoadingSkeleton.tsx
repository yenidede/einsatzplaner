import { Skeleton } from '@/components/ui/skeleton';

interface SettingsLoadingSkeletonProps {
  sidebarItems?: number;
  contentItems?: number;
}

export function SettingsLoadingSkeleton({
  sidebarItems = 4,
  contentItems = 4,
}: SettingsLoadingSkeletonProps) {
  return (
    <div className="bg-background -mt-8 min-h-screen overflow-clip rounded-l">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <Skeleton className="mb-14 h-10 w-full" />
            <div className="space-y-2">
              {[...Array(sidebarItems)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </aside>
          <main className="flex-1 space-y-6">
            {[...Array(contentItems)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}

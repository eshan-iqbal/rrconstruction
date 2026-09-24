'use client';

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800/80 ${className}`}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-xl bg-zinc-800" />
        <Skeleton className="w-14 h-4 rounded bg-zinc-800" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-20 h-3 rounded bg-zinc-800" />
        <Skeleton className="w-32 h-7 rounded bg-zinc-800" />
        <Skeleton className="w-24 h-3 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton className="w-9 h-9 rounded-xl bg-zinc-800 shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="w-36 h-4 rounded bg-zinc-800" />
          <Skeleton className="w-24 h-3 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-4">
        {Array.from({ length: columns - 2 }).map((_, i) => (
          <Skeleton key={i} className="w-20 h-4 rounded bg-zinc-800" />
        ))}
      </div>
      <Skeleton className="w-16 h-7 rounded-xl bg-zinc-800 shrink-0" />
    </div>
  );
}

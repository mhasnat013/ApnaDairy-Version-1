import { ReactNode } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { LoadingState, EmptyState } from "../../components/ui/States";
import { ApiError } from "../../lib/apiClient";

/**
 * Renders loading / empty / content for public list queries.
 * A failed fetch (backend not yet connected) is shown as an honest
 * "not available yet" empty state rather than a crash — with retry.
 */
export function QueryView<T>({
  query,
  emptyTitle,
  emptyHint,
  emptyIcon,
  children,
}: {
  query: UseQueryResult<T[]>;
  emptyTitle: string;
  emptyHint: string;
  emptyIcon?: ReactNode;
  children: (items: T[]) => ReactNode;
}) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : null;
    const notFound = status === 404;
    return (
      <EmptyState
        icon={emptyIcon}
        title={notFound ? emptyTitle : "Couldn't load this right now"}
        hint={notFound ? emptyHint : "The server isn't responding. Please check back in a moment."}
        action={
          <button
            onClick={() => query.refetch()}
            className="btn-lift mt-2 h-10 rounded-full border border-line bg-white px-5 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Try again
          </button>
        }
      />
    );
  }
  const items = query.data ?? [];
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />;
  }
  return <>{children(items)}</>;
}

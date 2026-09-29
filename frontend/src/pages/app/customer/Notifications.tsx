import { useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { FilterBar, FilterSelect, QueryState, fmtDateTime } from "../../../features/portal/components";
import { useMarkAllRead, useMarkRead, useNotifications } from "../../../features/portal/apiEngagement";
import { cn } from "../../../lib/cn";

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifs = useNotifications(unreadOnly);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  return (
    <div>
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Account, saved-farm and delivery updates."
        actions={
          (notifs.data ?? []).some((n) => !n.isRead) ? (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
            </Button>
          ) : undefined
        }
      />
      <FilterBar>
        <FilterSelect
          value={unreadOnly ? "unread" : "all"}
          onChange={(v) => setUnreadOnly(v === "unread")}
          label="Filter notifications"
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread only" },
          ]}
        />
      </FilterBar>
      <QueryState
        isLoading={notifs.isLoading}
        isError={notifs.isError}
        error={notifs.error}
        isEmpty={!notifs.data || notifs.data.length === 0}
        emptyTitle="You're all caught up"
        emptyHint="New updates will appear here."
        emptyIcon={<Bell className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => notifs.refetch()}
      >
        <Card className="divide-y divide-line">
          {(notifs.data ?? []).map((n) => (
            <div key={n.id} className={cn("flex items-start gap-4 px-5 py-4", !n.isRead && "bg-mint/30")}>
              <span className={cn("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", n.isRead ? "bg-palegreen text-muted" : "bg-brand text-white")}>
                {n.isRead ? <BellOff className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-ink">{n.message}</p>
                <p className="mt-1 text-xs capitalize text-muted">{n.type.replace(/_/g, " ")} · {fmtDateTime(n.sentAt)}</p>
              </div>
              {!n.isRead && (
                <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)} loading={markRead.isPending}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </Card>
      </QueryState>
    </div>
  );
}

import { useState } from "react";
import { UserRound } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ConfirmAction, FilterBar, FilterSelect, Pagination, QueryState, StatusBadge } from "../../../features/portal/components";
import { useSetUserStatus, useUsers, PAGE_SIZE } from "../../../features/portal/apiCore";

export function AdminUsers() {
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const users = useUsers({ role: role || undefined, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE });
  const setStatus = useSetUserStatus();

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Users" description="Every account on the platform — verify, suspend or restore." />
      <FilterBar>
        <FilterSelect
          value={role}
          onChange={(v) => { setRole(v); setPage(1); }}
          label="Filter by role"
          options={[
            { value: "", label: "All roles" },
            { value: "customer", label: "Customer" },
            { value: "farmer", label: "Farmer" },
            { value: "business", label: "Business" },
            { value: "rider", label: "Rider" },
            { value: "admin", label: "Admin" },
          ]}
        />
      </FilterBar>
      <QueryState
        isLoading={users.isLoading}
        isError={users.isError}
        error={users.error}
        isEmpty={!users.data || users.data.length === 0}
        emptyTitle="No users"
        emptyHint="No users match this filter."
        emptyIcon={<UserRound className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => users.refetch()}
      >
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Verified</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(users.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">{u.fullName}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={u.role} /></td>
                    <td className="px-5 py-3 text-muted">{u.isVerified ? "Yes" : "No"}</td>
                    <td className="px-5 py-3"><StatusBadge status={u.status ?? "active"} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!u.isVerified && (
                          <Button variant="outline" size="sm" onClick={() => setStatus.mutate({ id: u.id, body: { isVerified: true } })} loading={setStatus.isPending}>
                            Verify
                          </Button>
                        )}
                        {u.role !== "admin" && (
                          <ConfirmAction
                            title={u.status === "suspended" ? "Restore user" : "Suspend user"}
                            message={`${u.status === "suspended" ? "Restore" : "Suspend"} ${u.fullName}'s account?`}
                            confirmLabel={u.status === "suspended" ? "Restore" : "Suspend"}
                            danger={u.status !== "suspended"}
                            onConfirm={() => setStatus.mutate({ id: u.id, body: { status: u.status === "suspended" ? "active" : "suspended" } })}
                          >
                            <Button variant="ghost" size="sm" className={u.status === "suspended" ? "text-brand" : "text-danger"}>
                              {u.status === "suspended" ? "Restore" : "Suspend"}
                            </Button>
                          </ConfirmAction>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Pagination
          page={page}
          pageCount={(users.data ?? []).length < PAGE_SIZE ? page : page + 1}
          onPage={setPage}
        />
      </QueryState>
    </div>
  );
}

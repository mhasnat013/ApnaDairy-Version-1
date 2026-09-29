import { useState } from "react";
import { ShieldCheck, UserCog, Users } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ConfirmAction, Field, FilterBar, FilterSelect, FormModal, QueryState, SearchInput, StatusBadge, fmtDate, inputCls } from "../../../features/portal/components";
import { useAdminApplications, useAdminAssignments, useCreateAdminApplication, useCreateAdminAssignment, useDecideAdminApplication, useRevokeAdminAssignment, useSuperAdminFarms, useSuperAdminUsers, useUpdateSuperAdminUser } from "../../../features/portal/apiSuperAdmin";

type Tab = "accounts" | "applications" | "assignments";

function Tabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<[Tab, string]> = [["accounts", "Accounts"], ["applications", "Admin applications"], ["assignments", "Farm assignments"]];
  return <div className="mb-6 flex flex-wrap gap-2">{tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${value === key ? "bg-brand text-white" : "bg-white text-muted hover:text-ink"}`}>{label}</button>)}</div>;
}

export function SuperAdminUsers() {
  const [tab, setTab] = useState<Tab>("accounts");
  return <div><PageHeader eyebrow="Super Admin" title="Access governance" description="Manage platform accounts, Admin access applications and Admin-to-farm coverage." /><Tabs value={tab} onChange={setTab} />{tab === "accounts" ? <Accounts /> : tab === "applications" ? <Applications /> : <Assignments />}</div>;
}

function Accounts() {
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const users = useSuperAdminUsers({ role: role || undefined, search: search || undefined });
  const update = useUpdateSuperAdminUser();
  return <><FilterBar><SearchInput label="Search accounts" value={search} onChange={setSearch} placeholder="Name, email or phone…" /><FilterSelect label="Role" value={role} onChange={setRole} options={[{ value: "", label: "All roles" }, { value: "admin", label: "Admin" }, { value: "farmer", label: "Farmer" }, { value: "customer", label: "Customer" }, { value: "business", label: "Business" }, { value: "rider", label: "Rider" }]} /></FilterBar>
    {update.isError && <p role="alert" className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{update.error instanceof Error ? update.error.message : "Could not update account."}</p>}
    <QueryState isLoading={users.isLoading} isError={users.isError} error={users.error} isEmpty={!users.data?.length} emptyTitle="No accounts found" emptyIcon={<Users className="h-7 w-7" />} onRetry={() => users.refetch()}><Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">Account</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-line">{(users.data ?? []).map((user) => <tr key={user.id}><td className="px-5 py-3"><p className="font-semibold text-ink">{user.fullName}</p><p className="text-xs text-muted">{user.email}{user.city ? ` · ${user.city}` : ""}</p></td><td className="px-5 py-3"><StatusBadge status={user.role} /></td><td className="px-5 py-3 text-muted">{fmtDate(user.createdAt)}</td><td className="px-5 py-3"><StatusBadge status={user.status} /></td><td className="px-5 py-3"><div className="flex justify-end gap-2">{!user.isVerified && <Button variant="outline" size="sm" loading={update.isPending} onClick={() => update.mutate({ id: user.id, isVerified: true })}>Verify</Button>}<ConfirmAction title={user.status === "suspended" ? "Restore account" : "Suspend account"} message={`${user.status === "suspended" ? "Restore" : "Suspend"} ${user.fullName}'s account?`} confirmLabel={user.status === "suspended" ? "Restore" : "Suspend"} danger={user.status !== "suspended"} onConfirm={() => update.mutate({ id: user.id, status: user.status === "suspended" ? "active" : "suspended" })}><Button variant="ghost" size="sm" className={user.status === "suspended" ? "text-brand" : "text-danger"}>{user.status === "suspended" ? "Restore" : "Suspend"}</Button></ConfirmAction></div></td></tr>)}</tbody></table></div></Card></QueryState></>;
}

function Applications() {
  const applications = useAdminApplications();
  const create = useCreateAdminApplication();
  const decide = useDecideAdminApplication();
  const users = useSuperAdminUsers();
  const [open, setOpen] = useState(false);
  const [applicantUserId, setApplicantUserId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState<{ id: number; status: "approved" | "rejected" } | null>(null);
  const [notes, setNotes] = useState("");
  const eligible = (users.data ?? []).filter((user) => !["admin", "superadmin"].includes(user.role));
  const createError = create.error instanceof Error ? create.error.message : null;
  const decisionError = decide.error instanceof Error ? decide.error.message : null;
  return <><div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><ShieldCheck className="h-4 w-4" />New application</Button></div>
    <QueryState isLoading={applications.isLoading} isError={applications.isError} error={applications.error} isEmpty={!applications.data?.length} emptyTitle="No Admin applications" emptyHint="There are no access applications to review." emptyIcon={<ShieldCheck className="h-7 w-7" />} onRetry={() => applications.refetch()}><div className="space-y-3">{(applications.data ?? []).map((item) => <Card key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-ink">Application #{item.id} · User #{item.applicantUserId}</h2><p className="mt-1 text-sm text-muted">{item.reason || "No reason supplied."}</p><p className="mt-2 text-xs text-muted">Submitted {fmtDate(item.submittedAt)}</p>{item.reviewNotes && <p className="mt-2 rounded-xl bg-palegreen/50 p-3 text-sm text-muted">Review: {item.reviewNotes}</p>}</div><div className="flex items-center gap-2"><StatusBadge status={item.status} />{item.status === "pending" && <><Button size="sm" onClick={() => { setNotes(""); setReviewing({ id: item.id, status: "approved" }); }}>Approve</Button><Button variant="outline" size="sm" className="text-danger" onClick={() => { setNotes(""); setReviewing({ id: item.id, status: "rejected" }); }}>Reject</Button></>}</div></div></Card>)}</div></QueryState>
    <FormModal open={open} onClose={() => setOpen(false)} title="Create Admin application" onSubmit={() => create.mutate({ applicantUserId: Number(applicantUserId), reason: reason || undefined }, { onSuccess: () => { setOpen(false); setApplicantUserId(""); setReason(""); } })} loading={create.isPending} error={createError}><Field label="Applicant"><select className={inputCls} value={applicantUserId} onChange={(e) => setApplicantUserId(e.target.value)} required><option value="">Select an account</option>{eligible.map((user) => <option key={user.id} value={user.id}>{user.fullName} ({user.email})</option>)}</select></Field><Field label="Reason"><textarea className={`${inputCls} h-28 py-3`} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></FormModal>
    <FormModal open={reviewing !== null} onClose={() => setReviewing(null)} title={`${reviewing?.status === "approved" ? "Approve" : "Reject"} Admin application`} onSubmit={() => reviewing && decide.mutate({ id: reviewing.id, status: reviewing.status, reviewNotes: notes || undefined }, { onSuccess: () => setReviewing(null) })} submitLabel={reviewing?.status === "approved" ? "Approve" : "Reject"} loading={decide.isPending} error={decisionError}><Field label="Review notes"><textarea className={`${inputCls} h-28 py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></FormModal></>;
}

function Assignments() {
  const assignments = useAdminAssignments();
  const admins = useSuperAdminUsers({ role: "admin", status: "active" });
  const farms = useSuperAdminFarms();
  const create = useCreateAdminAssignment();
  const revoke = useRevokeAdminAssignment();
  const [open, setOpen] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [farmId, setFarmId] = useState("");
  const error = (create.error ?? revoke.error) instanceof Error ? (create.error ?? revoke.error as Error).message : null;
  return <>{error && <p role="alert" className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}<div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><UserCog className="h-4 w-4" />Assign farm</Button></div>
    <QueryState isLoading={assignments.isLoading} isError={assignments.isError} error={assignments.error} isEmpty={!assignments.data?.length} emptyTitle="No active assignments" emptyHint="Assign an active Admin to a farm to establish oversight." emptyIcon={<UserCog className="h-7 w-7" />} onRetry={() => assignments.refetch()}><div className="grid gap-4 md:grid-cols-2">{(assignments.data ?? []).map((item) => { const admin = admins.data?.find((entry) => entry.id === item.adminId); const farm = farms.data?.find((entry) => entry.id === item.farmId); return <Card key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ink">{admin?.fullName ?? `Admin #${item.adminId}`}</h2><p className="text-sm text-muted">{farm?.farmName ?? `Farm #${item.farmId}`}</p><p className="mt-2 text-xs text-muted">Assigned {fmtDate(item.assignedAt)}</p></div><ConfirmAction title="Revoke assignment" message="Remove this Admin's active responsibility for the farm?" confirmLabel="Revoke" danger onConfirm={() => revoke.mutate(item.id)}><Button variant="outline" size="sm" className="text-danger" loading={revoke.isPending}>Revoke</Button></ConfirmAction></div></Card>; })}</div></QueryState>
    <FormModal open={open} onClose={() => setOpen(false)} title="Assign Admin to farm" onSubmit={() => create.mutate({ adminId: Number(adminId), farmId: Number(farmId) }, { onSuccess: () => { setOpen(false); setAdminId(""); setFarmId(""); } })} loading={create.isPending} error={create.error instanceof Error ? create.error.message : null}><Field label="Active Admin"><select className={inputCls} value={adminId} onChange={(e) => setAdminId(e.target.value)} required><option value="">Select an Admin</option>{(admins.data ?? []).map((admin) => <option key={admin.id} value={admin.id}>{admin.fullName} ({admin.email})</option>)}</select></Field><Field label="Farm"><select className={inputCls} value={farmId} onChange={(e) => setFarmId(e.target.value)} required><option value="">Select a farm</option>{(farms.data ?? []).map((farm) => <option key={farm.id} value={farm.id}>{farm.farmName} · {farm.location}</option>)}</select></Field></FormModal></>;
}

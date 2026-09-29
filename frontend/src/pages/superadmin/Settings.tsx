import { useEffect, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, FormModal, QueryState, fmtDateTime, inputCls } from "../../features/portal/components";
import { PlatformSetting, usePlatformSettings, useUpdatePlatformSetting } from "../../features/portal/apiSuperAdmin";

function display(value: unknown) { return typeof value === "string" ? value : JSON.stringify(value, null, 2); }

export function SuperAdminSettings() {
  const settings = usePlatformSettings();
  const update = useUpdatePlatformSetting();
  const [editing, setEditing] = useState<PlatformSetting | null | "new">(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (editing && editing !== "new") { setKey(editing.key); setValue(display(editing.value)); } else if (editing === "new") { setKey(""); setValue(""); } setError(null); }, [editing]);
  const save = () => {
    if (!key.trim()) { setError("A setting key is required."); return; }
    let parsed: unknown = value;
    try { parsed = JSON.parse(value); } catch { /* plain strings are valid */ }
    update.mutate({ key: key.trim(), value: parsed }, { onSuccess: () => setEditing(null), onError: (e) => setError(e instanceof Error ? e.message : "Could not save setting.") });
  };
  return <div>
    <PageHeader eyebrow="Super Admin" title="Platform settings" description="Non-secret operational configuration stored by the platform." actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add setting</Button>} />
    <QueryState isLoading={settings.isLoading} isError={settings.isError} error={settings.error} isEmpty={!settings.data?.length} emptyTitle="No platform settings" emptyHint="Create the first non-secret operational setting." emptyIcon={<Settings2 className="h-7 w-7" />} emptyAction={<Button onClick={() => setEditing("new")}>Add setting</Button>} onRetry={() => settings.refetch()}>
      <div className="space-y-3">{(settings.data ?? []).map((setting) => <Card key={setting.key} className="flex flex-wrap items-start justify-between gap-4 p-5"><div className="min-w-0"><h2 className="font-mono text-sm font-bold text-ink">{setting.key}</h2><pre className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm text-muted">{display(setting.value)}</pre><p className="mt-2 text-xs text-muted">Updated {fmtDateTime(setting.updatedAt)}{setting.updatedBy ? ` by #${setting.updatedBy}` : ""}</p></div><Button variant="outline" size="sm" onClick={() => setEditing(setting)}>Edit</Button></Card>)}</div>
    </QueryState>
    <FormModal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add platform setting" : "Edit platform setting"} description="Secrets, passwords, tokens and API keys are rejected by the backend." onSubmit={save} loading={update.isPending} error={error}><Field label="Setting key"><input className={inputCls} value={key} disabled={editing !== "new"} onChange={(e) => setKey(e.target.value)} placeholder="support.contacts" /></Field><Field label="Value" hint="Enter JSON for lists/objects, or plain text for a string."><textarea className={`${inputCls} h-36 py-3 font-mono`} value={value} onChange={(e) => setValue(e.target.value)} /></Field></FormModal>
  </div>;
}

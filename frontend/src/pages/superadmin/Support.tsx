import { Headphones, Mail, Phone } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { QueryState } from "../../features/portal/components";
import { useSupportContacts } from "../../features/portal/apiSuperAdmin";

export function SuperAdminSupport() {
  const contacts = useSupportContacts();
  return <div>
    <PageHeader eyebrow="Super Admin" title="Support contacts" description="Configured technical and operational contacts for platform incidents." />
    <QueryState isLoading={contacts.isLoading} isError={contacts.isError} error={contacts.error} isEmpty={!contacts.data?.length} emptyTitle="No support contacts configured" emptyHint="Add support.contacts in Platform settings to publish the escalation directory." emptyIcon={<Headphones className="h-7 w-7" />} onRetry={() => contacts.refetch()}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(contacts.data ?? []).map((contact, index) => <Card key={`${contact.email}-${index}`} className="p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-brand-pine"><Headphones className="h-5 w-5" /></div><h2 className="mt-4 font-display text-lg font-semibold text-ink">{contact.name}</h2><p className="text-sm text-muted">{contact.role ?? "Support contact"}</p><div className="mt-4 space-y-2 text-sm"><a href={`mailto:${contact.email}`} className="flex items-center gap-2 font-medium text-brand hover:underline"><Mail className="h-4 w-4" />{contact.email}</a>{contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 font-medium text-brand hover:underline"><Phone className="h-4 w-4" />{contact.phone}</a>}</div></Card>)}</div>
    </QueryState>
  </div>;
}

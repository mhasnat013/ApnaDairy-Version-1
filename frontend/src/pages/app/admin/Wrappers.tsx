import { BellOff } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { AdminChatOversight } from "./ChatOversight";
import { ProfilePage } from "../shared/Profile";

export function AdminProfile() {
  return <ProfilePage role="admin" />;
}

export function AdminChat() {
  return <AdminChatOversight />;
}

export function AdminNotifications() {
  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Notifications"
        description="Platform-wide notification broadcast."
      />
      <Card className="max-w-2xl p-8 text-center">
        <BellOff className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
        <h2 className="mt-3 font-display text-xl font-semibold text-ink">Not available</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          The current API supports reading your own notifications, but there is no broadcast or
          create endpoint for administrators. Notifications are sent automatically by the system —
          for example when a farm is verified or a quotation is accepted.
        </p>
      </Card>
    </div>
  );
}

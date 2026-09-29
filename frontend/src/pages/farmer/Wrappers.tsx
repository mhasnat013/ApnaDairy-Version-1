import { ChatPage } from "../shared/Chat";
import { ProfilePage } from "../shared/Profile";
import { Card } from "../../components/ui/Card";

export function FarmerSupport() {
  return <ChatPage title="Farmer support" description="Farm verification, batches, payments and account help." />;
}

export function FarmerProfile() {
  return <ProfilePage role="farmer" />;
}

export function FarmerSettings() {
  return (
    <div>
      <ProfilePage role="farmer" />
      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Account settings</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          To update your account details or close your account, contact ApnaDairy support through the chat
          above — changes are verified manually for safety. Farm details can be edited directly from the{" "}
          <a href="/app/farmer/profile" className="font-semibold text-brand hover:underline">Farm profile</a> page.
        </p>
      </Card>
    </div>
  );
}

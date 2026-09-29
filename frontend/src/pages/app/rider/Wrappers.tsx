import { ChatPage } from "../shared/Chat";
import { ProfilePage } from "../shared/Profile";

export function RiderSupport() {
  return <ChatPage title="Rider support" description="Assignment, route and payout help for riders." />;
}

export function RiderProfile() {
  return <ProfilePage role="rider" />;
}

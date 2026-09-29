import { ChatPage } from "../shared/Chat";
import { ProfilePage } from "../shared/Profile";

export function CustomerSupport() {
  return <ChatPage title="Customer support" description="Delivery questions, farm information and account support." />;
}

export function CustomerProfile() {
  return <ProfilePage role="customer" />;
}

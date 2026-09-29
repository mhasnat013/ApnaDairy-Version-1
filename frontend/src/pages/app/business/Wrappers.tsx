import { useParams } from "react-router-dom";
import { ChatPage } from "../shared/Chat";
import { ProfilePage } from "../shared/Profile";
import { TrackDeliveryPage } from "../shared/TrackDelivery";
import { OnboardingPage } from "../shared/Onboarding";

export function BusinessSupport() {
  return <ChatPage title="Business support" description="Procurement, quotations and billing help for buyers." />;
}

export function BusinessProfile() {
  return <ProfilePage role="business" />;
}

export function BusinessTracking() {
  const rawId = useParams().deliveryId;
  const deliveryId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  return <TrackDeliveryPage deliveryId={deliveryId} />;
}

export function BusinessOnboarding() {
  return (
    <OnboardingPage
      role="business"
      title="Buyer onboarding"
      steps={[
        { label: "Create your business account", done: true },
        { label: "Complete your company profile", done: false, to: "/app/business/profile", actionLabel: "Complete profile" },
        { label: "Post your first bulk request", done: false, to: "/app/business/requests", actionLabel: "Post request" },
        { label: "Compare quotations and accept a deal", done: false, to: "/app/business/requests", actionLabel: "View requests" },
        { label: "Track delivery and settle payment", done: false, to: "/app/business/orders", actionLabel: "View orders" },
      ]}
    />
  );
}


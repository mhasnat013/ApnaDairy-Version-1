import { useParams } from "react-router-dom";
import { TrackDeliveryPage } from "../shared/TrackDelivery";

export function CustomerTrackDelivery() {
  const rawId = useParams().deliveryId;
  const deliveryId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  return <TrackDeliveryPage deliveryId={deliveryId} />;
}

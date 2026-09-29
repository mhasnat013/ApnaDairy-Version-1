import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { qs } from "./apiCore";
import type { ChatReply, Complaint, Notification, Review, Subscription } from "./types";

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export function useSubscriptions() {
  return useQuery({
    queryKey: ["portal", "subscriptions"],
    queryFn: () => apiClient.get<Subscription[]>("/subscriptions"),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { farmId: number; productId?: number; frequency: string }) =>
      apiClient.post<Subscription>("/subscriptions", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "subscriptions"] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { frequency?: string; status?: string } }) =>
      apiClient.patch<Subscription>(`/subscriptions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "subscriptions"] }),
  });
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export function useReviews(filters: { farmId?: number; productId?: number } = {}) {
  return useQuery({
    queryKey: ["portal", "reviews", filters],
    queryFn: () =>
      apiClient.get<Review[]>(
        `/reviews${qs({ farm_id: filters.farmId, product_id: filters.productId, skip: 0, limit: 50 })}`,
      ),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { farmId?: number; productId?: number; rating: number; comment?: string }) =>
      apiClient.post<Review>("/reviews", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "reviews"] }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`/reviews/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "reviews"] }),
  });
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

export function useComplaints(status?: string) {
  return useQuery({
    queryKey: ["portal", "complaints", status],
    queryFn: () => apiClient.get<Complaint[]>(`/complaints${qs({ status, skip: 0, limit: 50 })}`),
  });
}

export function useComplaint(id: number | undefined) {
  return useQuery({
    queryKey: ["portal", "complaint", id],
    queryFn: () => apiClient.get<Complaint>(`/complaints/${id}`),
    enabled: id !== undefined,
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; description: string; orderId?: number }) =>
      apiClient.post<Complaint>("/complaints", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "complaints"] }),
  });
}

/** Admin: update complaint status. */
export function useUpdateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { status?: string; description?: string } }) =>
      apiClient.patch<Complaint>(`/complaints/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "complaints"] });
      qc.invalidateQueries({ queryKey: ["portal", "complaint", v.id] });
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["portal", "notifications", unreadOnly],
    queryFn: () =>
      apiClient.get<Notification[]>(`/notifications${qs({ unread_only: unreadOnly, skip: 0, limit: 50 })}`),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["portal", "unread-count"],
    queryFn: () => apiClient.get<{ unread_count: number }>("/notifications/unread-count"),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<{ message: string }>(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "notifications"] });
      qc.invalidateQueries({ queryKey: ["portal", "unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ message: string }>("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "notifications"] });
      qc.invalidateQueries({ queryKey: ["portal", "unread-count"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Support chatbot
// ---------------------------------------------------------------------------

export function useChatHistory(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "chat-history", sessionId],
    queryFn: () => apiClient.get<ChatReply["messages"]>(`/support/chat/history${qs({ session_id: sessionId })}`),
    enabled: sessionId !== undefined,
  });
}

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { message: string; sessionId?: string }) =>
      apiClient.post<ChatReply>("/support/chat", { message: body.message, sessionId: body.sessionId ?? null }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["portal", "chat-history", data.sessionId] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type {
  ActionLog,
  AdminOverview,
  AdulterationResponse,
  AuthUser,
  Batch,
  BusinessOverview,
  ChatSession,
  ChatSessionMessage,
  Farm,
  FarmerOverview,
  FarmSnapshot,
  FreshnessResponse,
  PlatformUser,
  Prediction,
  Reading,
  SimulateResponse,
} from "./types";

/** Build a query string from defined params only. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Auth / profile
// ---------------------------------------------------------------------------

export function useMe() {
  return useQuery({
    queryKey: ["portal", "me"],
    queryFn: () => apiClient.get<AuthUser>("/auth/me"),
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Farms
// ---------------------------------------------------------------------------

export interface FarmFilters {
  search?: string;
  verificationStatus?: string;
  skip?: number;
  limit?: number;
}

export function useFarms(filters: FarmFilters = {}) {
  return useQuery({
    queryKey: ["portal", "farms", filters],
    queryFn: () =>
      apiClient.get<Farm[]>(
        // NOTE: backend expects snake_case `verification_status` ("all" disables the filter)
        `/farms${qs({ search: filters.search, verification_status: filters.verificationStatus, skip: filters.skip ?? 0, limit: filters.limit ?? 50 })}`,
      ),
  });
}

export function useFarm(id: number | undefined) {
  return useQuery({
    queryKey: ["portal", "farm", id],
    queryFn: () => apiClient.get<Farm>(`/farms/${id}`),
    enabled: id !== undefined,
  });
}

/** The farm owned by the current user (farmer role).
 * The farms list endpoint does not expose owner ids, so the farm is resolved
 * through the farmer overview (which returns farmId) and then fetched by id.
 * Returns myFarm=null when the farmer has not registered a farm yet. */
export function useMyFarm() {
  const me = useMe();
  const overview = useFarmerOverview();
  const farmId = overview.data?.farmId;
  const farm = useFarm(farmId);
  const hasFarm = overview.isSuccess && farmId !== undefined;
  return {
    myFarm: hasFarm ? (farm.data ?? null) : null,
    me: me.data,
    isLoading: me.isLoading || overview.isLoading || (hasFarm && farm.isLoading),
    isError: me.isError || farm.isError,
    error: farm.error ?? me.error,
    refetch: () => {
      me.refetch();
      overview.refetch();
      farm.refetch();
    },
  };
}

export function useCreateFarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      farmName: string;
      location: string;
      description?: string;
      capacityLiters?: number;
      latitude?: number;
      longitude?: number;
      establishedDate?: string;
    }) => apiClient.post<Farm>("/farms", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "farms"] }),
  });
}

export function useUpdateFarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<{ farmName: string; location: string; description: string; capacityLiters: number }> }) =>
      apiClient.patch<Farm>(`/farms/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "farms"] }),
  });
}

// ---------------------------------------------------------------------------
// Milk batches
// ---------------------------------------------------------------------------

export interface BatchFilters {
  farmId?: number;
  status?: string;
  skip?: number;
  limit?: number;
}

export function useBatches(filters: BatchFilters = {}) {
  return useQuery({
    queryKey: ["portal", "batches", filters],
    queryFn: () =>
      apiClient.get<Batch[]>(
        `/batches${qs({ farm_id: filters.farmId, status: filters.status, skip: filters.skip ?? 0, limit: filters.limit ?? 50 })}`,
      ),
  });
}

export function useBatch(id: number | undefined) {
  return useQuery({
    queryKey: ["portal", "batch", id],
    queryFn: () => apiClient.get<Batch>(`/batches/${id}`),
    enabled: id !== undefined,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      farmId?: number;
      batchCode?: string;
      milkingTime: string;
      collectionTime?: string;
      quantityLiters: number;
      initialStorageTemp?: number;
    }) => apiClient.post<Batch>("/batches", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "batches"] }),
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { status?: string; quantityLiters?: number } }) =>
      apiClient.patch<Batch>(`/batches/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "batches"] });
      qc.invalidateQueries({ queryKey: ["portal", "batch", v.id] });
    },
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`/batches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "batches"] }),
  });
}

/** Run the AI freshness scoring pipeline for a batch (farmer/admin). */
export function useScoreBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<FreshnessResponse>(`/batches/${id}/score`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["portal", "batches"] });
      qc.invalidateQueries({ queryKey: ["portal", "batch", id] });
    },
  });
}

export function useBatchPredictions(batchId: number | undefined) {
  return useQuery({
    queryKey: ["portal", "batch-predictions", batchId],
    queryFn: () => apiClient.get<Prediction[]>(`/batches/${batchId}/predictions`),
    enabled: batchId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// IoT
// ---------------------------------------------------------------------------

export function useReadings(batchId: number | undefined, sensorType?: string) {
  return useQuery({
    queryKey: ["portal", "readings", batchId, sensorType],
    queryFn: () =>
      apiClient.get<Reading[]>(
        `/iot/batches/${batchId}/readings${qs({ sensor_type: sensorType, skip: 0, limit: 200 })}`,
      ),
    enabled: batchId !== undefined,
  });
}

export function useSimulateReadings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      batchId,
      body,
    }: {
      batchId: number;
      body: { hoursBack?: number; intervalMinutes?: number; baseTempC?: number; excursionCount?: number };
    }) => apiClient.post<SimulateResponse>(`/iot/batches/${batchId}/simulate`, body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["portal", "readings", v.batchId] }),
  });
}

export function useIngestReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { batchId: number; sensorType: string; readingValue: number; unit?: string; recordedAt?: string }) =>
      apiClient.post<Reading>("/iot/readings", body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["portal", "readings", v.batchId] }),
  });
}

// ---------------------------------------------------------------------------
// AI prediction
// ---------------------------------------------------------------------------

export function usePredictAdulteration() {
  return useMutation({
    mutationFn: (features: Record<string, number>) =>
      apiClient.post<AdulterationResponse>("/predict/adulteration", features, { unauthenticated: false }),
  });
}

export function usePredictFreshness() {
  return useMutation({
    mutationFn: (features: {
      timeSinceMilkingHours: number;
      avgTemperatureC: number;
      minTemperatureC: number;
      maxTemperatureC: number;
      temperatureStdC: number;
      timeAbove5cHours: number;
      timeAbove10cHours: number;
      temperatureExcursions: number;
    }) => apiClient.post<FreshnessResponse>("/predict/freshness", features),
  });
}

export function useAiStatus() {
  return useQuery({
    queryKey: ["portal", "ai-status"],
    queryFn: () => apiClient.get<Record<string, unknown>>("/ai/status"),
  });
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function useFarmerOverview() {
  return useQuery({
    queryKey: ["portal", "farmer-overview"],
    queryFn: () => apiClient.get<FarmerOverview>("/analytics/farmer/overview"),
  });
}

export function useBusinessOverview() {
  return useQuery({
    queryKey: ["portal", "business-overview"],
    queryFn: () => apiClient.get<BusinessOverview>("/analytics/business/overview"),
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["portal", "admin-overview"],
    queryFn: () => apiClient.get<AdminOverview>("/admin/analytics/overview"),
  });
}

export function usePlatformOverview() {
  return useQuery({
    queryKey: ["portal", "platform-overview"],
    queryFn: () => apiClient.get<Record<string, number | string | Record<string, number>>>("/admin/analytics/overview"),
  });
}

export function useSnapshots(farmId: number | undefined) {
  return useQuery({
    queryKey: ["portal", "snapshots", farmId],
    queryFn: () => apiClient.get<FarmSnapshot[]>(`/analytics/farms/${farmId}/snapshots`),
    enabled: farmId !== undefined,
  });
}

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ farmId, body }: { farmId: number; body: Record<string, string | number> }) =>
      apiClient.post<FarmSnapshot>(`/analytics/farms/${farmId}/snapshots`, body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["portal", "snapshots", v.farmId] }),
  });
}

// ---------------------------------------------------------------------------
// Admin: users, approvals, logs
// ---------------------------------------------------------------------------

export interface UserFilters {
  role?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ["portal", "users", filters],
    queryFn: () =>
      apiClient.get<PlatformUser[]>(
        `/admin/users${qs({ role: filters.role, status: filters.status, skip: filters.skip ?? 0, limit: filters.limit ?? 50 })}`,
      ),
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { isVerified?: boolean; status?: string; role?: string } }) =>
      apiClient.patch<PlatformUser>(`/admin/users/${id}/status`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "users"] }),
  });
}

export function usePendingFarms() {
  return useQuery({
    queryKey: ["portal", "pending-farms"],
    queryFn: () => apiClient.get<Farm[]>("/admin/farms/pending"),
  });
}

export function useVerifyFarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verificationStatus }: { id: number; verificationStatus: "verified" | "rejected" }) =>
      apiClient.post<Farm>(`/admin/farms/${id}/verify`, { verificationStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "pending-farms"] });
      qc.invalidateQueries({ queryKey: ["portal", "farms"] });
    },
  });
}

export function useActionLogs() {
  return useQuery({
    queryKey: ["portal", "action-logs"],
    queryFn: () => apiClient.get<ActionLog[]>("/admin/action-logs"),
  });
}

// ---------------------------------------------------------------------------
// Chatbot oversight (admin, read-only)
// ---------------------------------------------------------------------------

export function useChatSessions() {
  return useQuery({
    queryKey: ["portal", "admin", "chat-sessions"],
    queryFn: () => apiClient.get<ChatSession[]>("/admin/chat/sessions"),
  });
}

export function useChatSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["portal", "admin", "chat-session", sessionId],
    queryFn: () =>
      apiClient.get<ChatSessionMessage[]>(`/admin/chat/sessions/${encodeURIComponent(sessionId!)}`),
    enabled: sessionId !== null,
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

const base = "/super-admin";

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export interface SuperAdminDashboard {
  totalUsers: number;
  admins: number;
  farms: number;
  pendingFarms: number;
  milkBatches: number;
  aiAnomalies: number;
  openComplaints: number;
  openCases: number;
  pendingAdminApplications: number;
}

export interface SuperAdminUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  isVerified: boolean;
  city: string | null;
  createdAt: string | null;
}

export interface AdminApplication {
  id: number;
  applicantUserId: number;
  requestedRole: string;
  reason: string | null;
  status: string;
  submittedAt: string | null;
  reviewedBySuperadminId: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface AdminAssignment {
  id: number;
  adminId: number;
  farmId: number;
  assignedBySuperadminId: number;
  assignedAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
}

export interface GovernanceCase {
  id: number;
  caseCode: string;
  caseType: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  raisedByAdminId: number;
  assignedToSuperadminId: number | null;
  farmId: number | null;
  batchId: number | null;
  userId: number | null;
  complaintId: number | null;
  adminRemarks: string | null;
  resolutionNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
}

export interface SuperAdminFarm {
  id: number;
  ownerId: number;
  farmName: string;
  location: string;
  verificationStatus: string;
  capacityLiters: number | null;
  createdAt: string | null;
}

export interface SuperAdminAnalytics {
  days: number;
  usersByRole: Record<string, number>;
  newUsers: number;
  newFarms: number;
  newBatches: number;
  newCases: number;
  sensorReadings: number;
  predictions: number;
}

export interface AuditLog {
  id: number;
  actorId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string | null;
  createdAt: string | null;
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface SupportContact {
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
}

export function useSuperAdminDashboard() {
  return useQuery({ queryKey: ["superadmin", "dashboard"], queryFn: () => apiClient.get<SuperAdminDashboard>(`${base}/dashboard`) });
}

export function useSuperAdminUsers(filters: { role?: string; status?: string; search?: string } = {}) {
  return useQuery({ queryKey: ["superadmin", "users", filters], queryFn: () => apiClient.get<SuperAdminUser[]>(`${base}/users${query(filters)}`) });
}

export function useUpdateSuperAdminUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status?: string; isVerified?: boolean }) => apiClient.patch<SuperAdminUser>(`${base}/users/${id}/status`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ["superadmin", "users"] }),
  });
}

export function useAdminApplications(status?: string) {
  return useQuery({ queryKey: ["superadmin", "applications", status], queryFn: () => apiClient.get<AdminApplication[]>(`${base}/admin-applications${query({ status })}`) });
}

export function useCreateAdminApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { applicantUserId: number; reason?: string }) => apiClient.post<AdminApplication>(`${base}/admin-applications`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ["superadmin", "applications"] }),
  });
}

export function useDecideAdminApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status: "approved" | "rejected"; reviewNotes?: string }) => apiClient.patch<AdminApplication>(`${base}/admin-applications/${id}`, body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["superadmin", "applications"] });
      client.invalidateQueries({ queryKey: ["superadmin", "users"] });
    },
  });
}

export function useAdminAssignments(activeOnly = true) {
  return useQuery({ queryKey: ["superadmin", "assignments", activeOnly], queryFn: () => apiClient.get<AdminAssignment[]>(`${base}/admin-assignments${query({ active_only: activeOnly })}`) });
}

export function useCreateAdminAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { adminId: number; farmId: number }) => apiClient.post<AdminAssignment>(`${base}/admin-assignments`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ["superadmin", "assignments"] }),
  });
}

export function useRevokeAdminAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`${base}/admin-assignments/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["superadmin", "assignments"] }),
  });
}

export function useGovernanceCases(filters: { kind?: string; status?: string; priority?: string; search?: string } = {}) {
  return useQuery({ queryKey: ["superadmin", "cases", filters], queryFn: () => apiClient.get<GovernanceCase[]>(`${base}/cases${query(filters)}`) });
}

export function useGovernanceCase(id: number | undefined) {
  return useQuery({ queryKey: ["superadmin", "case", id], queryFn: () => apiClient.get<GovernanceCase>(`${base}/cases/${id}`), enabled: id !== undefined });
}

export function useUpdateGovernanceCase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status?: string; priority?: string; assignedToSuperadminId?: number; adminRemarks?: string; resolutionNotes?: string }) => apiClient.patch<GovernanceCase>(`${base}/cases/${id}`, body),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["superadmin", "cases"] });
      client.invalidateQueries({ queryKey: ["superadmin", "case", variables.id] });
    },
  });
}

export function useSuperAdminFarms(verificationStatus?: string) {
  return useQuery({ queryKey: ["superadmin", "farms", verificationStatus], queryFn: () => apiClient.get<SuperAdminFarm[]>(`${base}/farms${query({ verification_status: verificationStatus })}`) });
}

export function useSuperAdminAnalytics(days: number) {
  return useQuery({ queryKey: ["superadmin", "analytics", days], queryFn: () => apiClient.get<SuperAdminAnalytics>(`${base}/analytics${query({ days })}`) });
}

export function useAuditLogs(filters: { action?: string; entityType?: string } = {}) {
  return useQuery({ queryKey: ["superadmin", "audit", filters], queryFn: () => apiClient.get<AuditLog[]>(`${base}/audit-logs${query({ action: filters.action, entity_type: filters.entityType })}`) });
}

export function usePlatformSettings() {
  return useQuery({ queryKey: ["superadmin", "settings"], queryFn: () => apiClient.get<PlatformSetting[]>(`${base}/settings`) });
}

export function useUpdatePlatformSetting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => apiClient.patch<PlatformSetting>(`${base}/settings/${encodeURIComponent(key)}`, { value }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["superadmin", "settings"] }),
  });
}

export function useSupportContacts() {
  return useQuery({ queryKey: ["superadmin", "support-contacts"], queryFn: () => apiClient.get<SupportContact[]>(`${base}/support-contacts`) });
}

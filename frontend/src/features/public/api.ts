import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

/** Public catalog types — mirror the backend contract (plan §10). */

export interface Farm {
  id: number;
  name: string;
  location: string;
  description: string | null;
  verificationStatus: string;
  ratingAvg: number | null;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  description: string | null;
  unitOfMeasure: string;
  price: number;
  quantityAvailable: number;
  status: string;
  imageUrl: string | null;
  farmId: number;
  farmName?: string;
  batchCode?: string | null;
  freshnessScore?: number | null;
}

export interface BatchTrace {
  batchCode: string;
  farmName: string;
  farmLocation: string;
  milkingTime: string;
  quantityLiters: number;
  status: string;
  freshnessScore: number | null;
  spoilageRisk: string | null;
  readingCount: number;
}

export function useFarms() {
  return useQuery({
    queryKey: ["public", "farms"],
    queryFn: () => apiClient.get<Farm[]>("/farms"),
    retry: false,
  });
}

export function useFarm(id: string | undefined) {
  return useQuery({
    queryKey: ["public", "farms", id],
    queryFn: () => apiClient.get<Farm>(`/farms/${id}`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["public", "products"],
    queryFn: () => apiClient.get<Product[]>("/products"),
    retry: false,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["public", "products", id],
    queryFn: () => apiClient.get<Product>(`/products/${id}`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useBatchTrace(batchCode: string | undefined) {
  return useQuery({
    queryKey: ["public", "batch-trace", batchCode],
    queryFn: () => apiClient.get<BatchTrace>(`/batches/trace/${batchCode}`),
    enabled: Boolean(batchCode),
    retry: false,
  });
}

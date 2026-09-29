import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { qs } from "./apiCore";
import type {
  BulkRequest,
  Cart,
  Delivery,
  Discount,
  Order,
  Payment,
  PriceHistory,
  Product,
  Quotation,
  Tracking,
} from "./types";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductFilters {
  search?: string;
  category?: string;
  farmId?: number;
  status?: string;
  skip?: number;
  limit?: number;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ["portal", "products", filters],
    queryFn: () =>
      apiClient.get<Product[]>(
        `/products${qs({ search: filters.search, category: filters.category, farm_id: filters.farmId, status: filters.status, skip: filters.skip ?? 0, limit: filters.limit ?? 50 })}`,
      ),
  });
}

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: ["portal", "product", id],
    queryFn: () => apiClient.get<Product>(`/products/${id}`),
    enabled: id !== undefined,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      farmId?: number;
      name: string;
      category: string;
      description?: string;
      unitOfMeasure?: string;
      price: number;
      quantityAvailable?: number;
      batchId?: number;
      imageUrl?: string;
      status?: string;
    }) => apiClient.post<Product>("/products", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<{ name: string; category: string; description: string; unitOfMeasure: string; price: number; quantityAvailable: number; status: string; batchId: number | null }> }) =>
      apiClient.patch<Product>(`/products/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "products"] });
      qc.invalidateQueries({ queryKey: ["portal", "product", v.id] });
    },
  });
}

export function useChangePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPrice, reason }: { id: number; newPrice: number; reason?: string }) =>
      apiClient.patch<Product>(`/products/${id}/price`, { newPrice, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "products"] }),
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "products"] }),
  });
}

export function usePriceHistory(productId: number | undefined) {
  return useQuery({
    queryKey: ["portal", "price-history", productId],
    queryFn: () => apiClient.get<PriceHistory[]>(`/products/${productId}/price-history`),
    enabled: productId !== undefined,
  });
}

export function useDiscounts(productId: number | undefined) {
  return useQuery({
    queryKey: ["portal", "discounts", productId],
    queryFn: () => apiClient.get<Discount[]>(`/products/${productId}/discounts`),
    enabled: productId !== undefined,
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: number; body: { discountPercent: number; reason?: string; validFrom: string; validUntil: string } }) =>
      apiClient.post<Discount>(`/products/${productId}/discounts`, body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["portal", "discounts", v.productId] }),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`/discounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "discounts"] }),
  });
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export function useCart() {
  return useQuery({
    queryKey: ["portal", "cart"],
    queryFn: () => apiClient.get<Cart>("/cart"),
  });
}

export function useUpdateCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ productId: number; quantity: number }>) =>
      apiClient.put<Cart>("/cart", { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "cart"] }),
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<{ message: string }>("/cart"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "cart"] }),
  });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ["portal", "orders", status],
    queryFn: () => apiClient.get<Order[]>(`/orders${qs({ status, skip: 0, limit: 50 })}`),
  });
}

export function useOrder(id: number | undefined) {
  return useQuery({
    queryKey: ["portal", "order", id],
    queryFn: () => apiClient.get<Order>(`/orders/${id}`),
    enabled: id !== undefined,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { deliveryAddress?: string }) => apiClient.post<Order>("/orders", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "orders"] });
      qc.invalidateQueries({ queryKey: ["portal", "cart"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiClient.patch<Order>(`/orders/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "orders"] });
      qc.invalidateQueries({ queryKey: ["portal", "order", v.id] });
    },
  });
}

/** Simulated payment — the API returns the "no real money" disclaimer. */
export function usePayOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, method }: { id: number; method: string }) =>
      apiClient.post<Payment>(`/orders/${id}/pay`, { method }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["portal", "orders"] });
      qc.invalidateQueries({ queryKey: ["portal", "order", data.orderId] });
      qc.invalidateQueries({ queryKey: ["portal", "payments"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function usePayments() {
  return useQuery({
    queryKey: ["portal", "payments"],
    queryFn: () => apiClient.get<Payment[]>("/payments"),
  });
}

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------

export function useDeliveries(status?: string) {
  return useQuery({
    queryKey: ["portal", "deliveries", status],
    queryFn: () => apiClient.get<Delivery[]>(`/deliveries${qs({ status, skip: 0, limit: 50 })}`),
  });
}

export function useDelivery(id: number | undefined) {
  return useQuery({
    queryKey: ["portal", "delivery", id],
    queryFn: () => apiClient.get<Delivery>(`/deliveries/${id}`),
    enabled: id !== undefined,
  });
}

export function useAssignDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, riderId }: { id: number; riderId: number }) =>
      apiClient.patch<Delivery>(`/deliveries/${id}/assign`, { riderId }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "deliveries"] });
      qc.invalidateQueries({ queryKey: ["portal", "delivery", v.id] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiClient.patch<Delivery>(`/deliveries/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "deliveries"] });
      qc.invalidateQueries({ queryKey: ["portal", "delivery", v.id] });
    },
  });
}

export function useTracking(deliveryId: number | undefined) {
  return useQuery({
    queryKey: ["portal", "tracking", deliveryId],
    queryFn: () => apiClient.get<Tracking[]>(`/deliveries/${deliveryId}/tracking`),
    enabled: deliveryId !== undefined,
  });
}

export function useAddTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, statusUpdate }: { deliveryId: number; statusUpdate: string }) =>
      apiClient.post<Tracking>(`/deliveries/${deliveryId}/tracking`, { statusUpdate }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["portal", "tracking", v.deliveryId] }),
  });
}

// ---------------------------------------------------------------------------
// B2B
// ---------------------------------------------------------------------------

export function useBulkRequests(status?: string) {
  return useQuery({
    queryKey: ["portal", "bulk-requests", status],
    queryFn: () => apiClient.get<BulkRequest[]>(`/b2b/requests${qs({ status, skip: 0, limit: 50 })}`),
  });
}

export function useBulkRequest(id: number | undefined) {
  return useQuery({
    queryKey: ["portal", "bulk-request", id],
    queryFn: () => apiClient.get<BulkRequest>(`/b2b/requests/${id}`),
    enabled: id !== undefined,
  });
}

export function useCreateBulkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { productId: number; quantityRequested: number; targetPrice?: number; deadline?: string }) =>
      apiClient.post<BulkRequest>("/b2b/requests", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "bulk-requests"] }),
  });
}

export function useUpdateBulkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { status?: string; deadline?: string } }) =>
      apiClient.patch<BulkRequest>(`/b2b/requests/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "bulk-requests"] });
      qc.invalidateQueries({ queryKey: ["portal", "bulk-request", v.id] });
    },
  });
}

export function useRequestQuotations(requestId: number | undefined) {
  return useQuery({
    queryKey: ["portal", "request-quotations", requestId],
    queryFn: () => apiClient.get<Quotation[]>(`/b2b/requests/${requestId}/quotations`),
    enabled: requestId !== undefined,
  });
}

/** Farmer's own submitted quotations. */
export function useMyQuotations() {
  return useQuery({
    queryKey: ["portal", "my-quotations"],
    queryFn: () => apiClient.get<Quotation[]>("/b2b/quotations"),
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, body }: { requestId: number; body: { bidPrice: number; quantityOffered: number } }) =>
      apiClient.post<Quotation>(`/b2b/requests/${requestId}/quotations`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["portal", "my-quotations"] });
      qc.invalidateQueries({ queryKey: ["portal", "bulk-requests"] });
      qc.invalidateQueries({ queryKey: ["portal", "request-quotations", v.requestId] });
    },
  });
}

export function useAcceptQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Quotation>(`/b2b/quotations/${id}/accept`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["portal", "request-quotations", data.requestId] });
      qc.invalidateQueries({ queryKey: ["portal", "bulk-requests"] });
      qc.invalidateQueries({ queryKey: ["portal", "orders"] });
    },
  });
}

export function useRejectQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Quotation>(`/b2b/quotations/${id}/reject`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["portal", "request-quotations", data.requestId] });
      qc.invalidateQueries({ queryKey: ["portal", "bulk-requests"] });
    },
  });
}

export function usePricingRules() {
  return useQuery({
    queryKey: ["portal", "pricing-rules"],
    queryFn: () => apiClient.get<{ note: string; activeDiscounts: Discount[] }>("/pricing/rules"),
  });
}

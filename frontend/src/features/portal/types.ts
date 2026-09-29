/** Portal API types — mirror the FastAPI camelCase contract (backend app/schemas). */

/** Paginated wrapper (backend Page schema). */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isVerified: boolean;
  status: string | null;
  addressLine: string | null;
  city: string | null;
}

export interface Farm {
  id: number;
  name: string;
  location: string;
  description: string | null;
  verificationStatus: string;
  ratingAvg: number | null;
  userId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  capacityLiters?: number | null;
  establishedDate?: string | null;
  createdAt?: string | null;
}

export interface Prediction {
  id: number;
  batchId: number;
  predictedShelfLifeHours: number | null;
  freshnessScore: number | null;
  qualityClass: string | null;
  anomalyFlag: boolean;
  modelVersion: string | null;
  predictedAt: string | null;
}

export interface Batch {
  id: number;
  batchCode: string;
  farmId: number;
  farmName: string | null;
  milkingTime: string;
  collectionTime: string | null;
  quantityLiters: number;
  initialStorageTemp: number | null;
  status: string;
  createdAt: string | null;
  freshnessScore: number | null;
  spoilageRisk: string | null;
  latestPrediction: Prediction | null;
}

export interface Reading {
  id: number;
  batchId: number;
  sensorType: string;
  readingValue: number;
  unit: string | null;
  recordedAt: string | null;
  simulatedLabel: string;
}

export interface SimulateResponse {
  label: string;
  count: number;
  readings: Reading[];
}

export interface AdulterationResponse {
  adulterationStatus: string;
  adulterationProbabilities: Record<string, number>;
  adulterant: string;
  adulterantProbabilities: Record<string, number>;
  isUncertain: boolean;
  uncertaintyNote: string | null;
  modelVersion: string;
  disclaimer: string;
}

export interface FreshnessResponse {
  remainingShelfLifeHours: number;
  spoilageRisk: string;
  spoilageProbabilities: Record<string, number>;
  freshnessScore: number;
  qualityClass: string;
  anomalyDetected: boolean;
  anomalyReasons: string[];
  isUncertain: boolean;
  uncertaintyNote: string | null;
  featuresUsed: Record<string, number> | null;
  modelVersion: string;
  disclaimer: string;
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
  farmName?: string | null;
  batchId?: number | null;
  batchCode?: string | null;
  freshnessScore?: number | null;
}

export interface PriceHistory {
  id: number;
  productId: number;
  oldPrice: number;
  newPrice: number;
  changedAt: string | null;
  reason: string | null;
}

export interface Discount {
  id: number;
  productId: number;
  discountPercent: number;
  reason: string | null;
  validFrom: string;
  validUntil: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
  name: string;
  price: number;
  imageUrl: string | null;
  farmName: string | null;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface OrderItem {
  productId: number;
  quantity: number;
  name: string;
  price: number;
  farmId: number | null;
}

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  status: string;
  transactionRef: string | null;
  paidAt: string | null;
  disclaimer: string;
}

export interface Delivery {
  id: number;
  orderId: number;
  riderId: number | null;
  riderName: string | null;
  address: string | null;
  scheduledTime: string | null;
  deliveredTime: string | null;
  status: string;
}

export interface Order {
  id: number;
  userId: number;
  items: OrderItem[];
  orderDate: string | null;
  totalAmount: number;
  status: string;
  deliveryAddress: string | null;
  payment: Payment | null;
  delivery: Delivery | null;
}

export interface Tracking {
  id: number;
  deliveryId: number;
  statusUpdate: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string | null;
}

export interface BulkRequest {
  id: number;
  buyerId: number;
  buyerName: string | null;
  productId: number;
  productName: string | null;
  quantityRequested: number;
  targetPrice: number | null;
  deadline: string | null;
  status: string;
  createdAt: string | null;
  quotationCount: number;
}

export interface Quotation {
  id: number;
  requestId: number;
  farmId: number;
  farmName: string | null;
  bidPrice: number;
  quantityOffered: number;
  status: string;
  submittedAt: string | null;
}

export interface Subscription {
  id: number;
  userId: number;
  farmId: number;
  farmName: string | null;
  productId: number | null;
  productName: string | null;
  frequency: string;
  status: string;
  createdAt: string | null;
}

export interface Review {
  id: number;
  userId: number;
  userName: string | null;
  farmId: number | null;
  productId: number | null;
  rating: number;
  comment: string | null;
  createdAt: string | null;
}

export interface Complaint {
  id: number;
  userId: number;
  orderId: number | null;
  subject: string;
  description: string;
  status: string;
  createdAt: string | null;
  resolvedAt: string | null;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  sentAt: string | null;
}

export interface ChatMessage {
  id: number;
  sessionId: string;
  sender: string;
  messageText: string;
  sentAt: string | null;
}

/** Admin chatbot oversight — one row per conversation session. */
export interface ChatSession {
  session_id: string;
  user_id: number | null;
  user_email: string | null;
  messages: number;
  last_at: string | null;
}

/** Admin chatbot oversight — a single message inside a session. */
export interface ChatSessionMessage {
  id: number;
  session_id: string;
  user_id: number | null;
  sender: string;
  message_text: string;
  sent_at: string | null;
}

export interface ChatReply {
  reply: string;
  sessionId: string;
  configured: boolean;
  messages: ChatMessage[];
}

export interface ActionLog {
  id: number;
  adminId: number;
  adminName: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string | null;
}

export interface FarmerOverview {
  farmId: number;
  totalBatches: number;
  totalProducts: number;
  activeOrders: number;
  totalRevenue: number;
  avgFreshnessScore: number | null;
  openComplaints: number;
}

export interface AdminOverview {
  totalUsers: number;
  totalFarms: number;
  pendingFarms: number;
  totalBatches: number;
  totalOrders: number;
  totalRevenue: number;
  openComplaints: number;
  activeSubscriptions: number;
}

export interface BusinessOverview {
  openRequests: number;
  totalQuotations: number;
  acceptedQuotations: number;
  totalSpent: number;
}

export interface FarmSnapshot {
  id: number;
  farmId: number;
  productCategory: string;
  periodStart: string;
  periodEnd: string;
  quantityProduced: number;
  quantitySold: number;
  quantityWasted: number;
  revenue: number;
  cost: number;
  profit: number;
  loss: number;
  createdAt: string | null;
}

export interface PlatformUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isVerified: boolean;
  status: string | null;
}

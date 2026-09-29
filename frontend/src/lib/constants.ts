/** Shared constants: roles, honest demo labels, brand copy. */

export const ROLES = ["customer", "farmer", "business", "rider", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HOME: Record<Role, string> = {
  customer: "/app/customer",
  farmer: "/app/farmer",
  business: "/app/business",
  rider: "/app/rider",
  admin: "/app/admin",
  superadmin: "/app/superadmin",
};

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  farmer: "Farmer",
  business: "Business",
  rider: "Delivery Rider",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

/** Exact honest-demo labels required across the product. */
export const DEMO_LABELS = {
  iot: "Simulated IoT reading",
  ai: "Demonstration prediction",
  payment: "Demo payment — no real money will be charged",
} as const;

export const BRAND = {
  tagline: "Freshness you can trust.",
  subline: "From our farms to your table — verified, traceable and intelligently monitored.",
} as const;

/** The four homepage ecosystem modules (plan §15/§17). */
export const MODULES = [
  {
    id: "b2c",
    title: "B2C Marketplace",
    short: "For homes",
    description:
      "Fresh dairy from verified Pakistani farms, delivered to your doorstep with product origin and freshness information.",
    features: [
      "Verified farm profiles with location and ratings",
      "Products connected to their farm and milk batch",
      "AI freshness score on every listing",
      "Subscriptions for daily milk delivery",
      "Transparent dynamic pricing",
    ],
    beneficiaries: "Households across Pakistan who want milk they can verify, not just buy.",
    exploreTo: "/marketplace",
  },
  {
    id: "b2b",
    title: "B2B Procurement",
    short: "For businesses",
    description:
      "Bulk buyers post purchase requests and receive competitive quotations from verified farms — structured bidding with comparison, acceptance and order tracking built in.",
    features: [
      "Post bulk purchase requests with target pricing",
      "Receive and compare farm quotations side by side",
      "Supplier directory of verified farms",
      "Bulk order and payment tracking",
      "Procurement analytics",
    ],
    beneficiaries: "Dairies, retailers, hotels and food businesses sourcing milk at scale.",
    exploreTo: "/for-businesses",
  },
  {
    id: "iot",
    title: "IoT Monitoring",
    short: "Cold chain",
    description:
      "Temperature and handling sensors follow every batch from milking to doorstep. Farmers and customers see the same live picture of the cold chain — with simulated readings clearly labelled during the demo.",
    features: [
      "Per-batch sensor readings: temperature, time, handling",
      "Cold-chain breach and excursion alerts",
      "Farm-level monitoring dashboards",
      "Full reading history per batch",
      "Clear labelling of simulated demo data",
    ],
    beneficiaries: "Farmers protecting quality and customers who want proof of proper handling.",
    exploreTo: "/freshness-engine",
  },
  {
    id: "ai",
    title: "AI Milking & Freshness",
    short: "Freshness AI",
    description:
      "Machine-learning models estimate remaining shelf life and spoilage risk from cold-chain data, and screen milk composition for adulteration — always presented as a demonstration estimate, never as laboratory certification.",
    features: [
      "Remaining shelf-life estimate per batch",
      "Spoilage risk classification (Low / Medium / High)",
      "Adulteration screening from composition data",
      "Probability and confidence shown with every result",
      "Rule-based anomaly flags for at-risk batches",
    ],
    beneficiaries: "Everyone in the chain — fewer surprises, less waste, safer milk.",
    exploreTo: "/freshness-engine",
  },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

# Frontend structure

The frontend is organized by responsibility so each portal is easy to find.

```text
src/
├── app/                 Router, route guards and app setup
├── pages/
│   ├── admin/           Admin portal pages
│   ├── superadmin/      Platform governance pages
│   ├── farmer/          Farmer portal pages
│   ├── business/        Business/B2B portal pages
│   ├── customer/        Customer portal pages
│   ├── rider/           Delivery rider pages
│   ├── shared/          Profile, chat and delivery pages shared by portals
│   ├── auth/            Login, registration and password pages
│   └── public/          Public marketing and marketplace pages
├── components/          Reusable visual components
├── features/portal/     API hooks, portal types and shared portal widgets
├── stores/               Global auth and UI state
└── lib/                  Constants, formatting and small helpers
```

## Admin portal map

| File | Purpose |
| --- | --- |
| `pages/admin/Dashboard.tsx` | Platform overview |
| `pages/admin/Users.tsx` | User accounts and status |
| `pages/admin/Farms.tsx` | Farm verification |
| `pages/admin/Operations.tsx` | Batches, orders, payments and deliveries |
| `pages/admin/Commerce.tsx` | Products, pricing and subscriptions |
| `pages/admin/B2B.tsx` | Bulk purchase requests and quotations |
| `pages/admin/AIIoT.tsx` | AI and cold-chain monitoring |
| `pages/admin/Analytics.tsx` | Platform analytics |
| `pages/admin/Support.tsx` | Complaints and support oversight |
| `pages/admin/ChatOversight.tsx` | Chat monitoring |
| `pages/admin/Wrappers.tsx` | Admin profile, chat and notifications routes |

The route definitions remain in `src/app/router.tsx`. API logic stays in
`src/features/portal/`, so pages only contain screen-level UI and actions.

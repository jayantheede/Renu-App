# ReNu-Biome Agricultural Operations & Grower Portal

> **A Product by SRavanga AI Smart Solutions**  
> Dedicated to sustainable biological crop nutrition, tank telemetry, and farm operations across California's Central Valley.

---

## 🌾 Overview

**ReNu-Biome** is a mission-critical, enterprise agricultural management platform and mobile companion application built with React Native (Expo Web & Native) and TypeScript, powered by a high-throughput Node.js / Express backend with MongoDB Atlas persistence.

The platform unifies biological crop nutrition programs, tank telemetry, delivery scheduling, and financial accounting for agricultural growers, farm managers, and administrative dispatchers.

---

## 🚀 Key Capabilities

### 👨‍🌾 Grower Portal
- **Ranches, Blocks & Tank Telemetry**: Track field blocks, rootstock, acreage, and irrigation sets. View real-time **Otodata cellular tank levels** with automated low-tank alerts below 25%.
- **OptimoRoute Delivery Tracking**: Real-time driver assignments, live ETAs, and two-way dispatch confirmation workflows.
- **Nutrition Program Tracking**: Monitor active almond nutrition programs (e.g., 2027 Almond Nutrition Program) with progress meters and nitrogen-loss buffers.
- **Soil & Tissue Lab Assays**: Submit field samples for independent lab analysis (Dellavalle Laboratory) with UC Davis critical deficiency reference ranges.
- **QuickBooks Invoicing & Statements**: View official branded invoices, payment statuses (Open, Paid, Overdue, Void), and print/export 300 DPI statements featuring the ReNu-Biome brand seal.
- **PWA Installation**: Standalone install page with iOS and Android detection and printable 300 DPI QR codes.

### 🏢 Admin Console
- **Today's Operations Dashboard**: Real-time financial metrics (YTD Revenue, Overdue Invoices, Active Deliveries, Open Receivables).
- **Orders & Delivery Dispatch**: Accept, reschedule, and assign deliveries with automatic email notification triggers.
- **Customer & Ranch Approvals**: Review onboarding applications, assign growers to dedicated field employees, and toggle ranch visibility.
- **QuickBooks Invoices Hub**: Hand-enter office invoices, link them to specific field deliveries, log payments, and print PDF statements.
- **Product Catalog Management**: Manage registered biological formulations (zero-price catalog enforcement) with complete chemical guarantees.
- **Feature Flags & Settings**: Granular per-feature toggles (ordering, payments, recommendations, telemetry, QuickBooks sync).

---

## 📱 Mobile Responsiveness & UI Design

The user interface is engineered for both desktop control centers and field-ready mobile operation:
- **Mobile First & Tablet Optimized**: Fluid responsive layouts for iOS Safari, Android Chrome, and native viewport sizes (375px to 1440px+).
- **Zero-Clipping Adaptive Headers**: Dynamically constrained titles and fixed-shrink action buttons (e.g., `+ Enter Invoice`) ensuring controls remain fully accessible on narrow devices.
- **Glassmorphic Navigation**: Translucent floating bottom tab bar with dynamic safe area inset calculation preventing content obstruction.
- **High Performance In-Memory Caching**: Non-blocking asynchronous database synchronization ensures mobile interactions return within milliseconds even over spotty 4G/5G orchard coverage.

---

## 🧾 Invoices & Document Generation

- **QuickBooks Office Hand-Entry**: Office administrators can log paper or digital QuickBooks invoices, track balance due, and link each invoice directly to a verified field delivery.
- **Official Brand Seal**: Both the in-app modal invoice statement and printable PDF documents display the high-resolution ReNu-Biome brand logo (`assets/brand/renu-biome-logo-teal-orange-for-light-backgrounds.png`).
- **High-DPI Print & PDF Export**: Instant print preview generator formatted for standard 8.5" x 11" paper or PDF export with complete remittance instructions.

---

## 🛠️ Architecture & Tech Stack

```
├── backend/                  # Node.js Express 5 API & MongoDB ORM
│   ├── src/
│   │   ├── index.ts          # Server entry point, SPA static hosting & routes
│   │   ├── routes.ts         # Authenticated API endpoints & business logic
│   │   ├── usersStore.ts     # In-memory cached store & MongoDB synchronization
│   │   ├── orderEmailService.ts # Nodemailer email workflows & responsive HTML templates
│   │   ├── auth.ts           # JWT authentication middleware & role guards
│   │   └── seedAuthenticData.ts # Central Valley staging seed records
│   ├── prisma/               # Prisma schema & MongoDB Atlas configuration
│   └── tests/                # Jest end-to-end and tank operation test suites
│
└── mobile/                   # React Native (Expo SDK 52+) Web & Native App
    ├── src/
    │   ├── api/client.ts     # Universal API client with offline caching
    │   ├── components/       # Reusable components (InvoiceLogo, ErrorBoundary, Map, etc.)
    │   ├── navigation/       # React Navigation (Root, Auth, Main, Admin, Employee)
    │   ├── screens/          # Portal screens (Ranches, Deliveries, Invoices, Admin, Auth)
    │   └── utils/            # PrintInvoice document generator, push notifications
    ├── assets/brand/         # Official brand logos, SVG icons, orchard imagery, QR assets
    └── public/               # Static assets & service workers for web export
```

---

## 🔐 Staging & Demo Credentials

For testing and local development, one-tap demo logins are available on the Sign In screen:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `support@renu-biome.com` | `admin` | Full Administrative Console & QuickBooks Hub |
| **Grower** | `customer@renu.com` | `customer` | Sierra Agri Group Grower Operations Portal |
| **Staff** | `employee@renu.com` | `employee` | Field Employee Delivery & Tasks Portal |

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm 9+
- MongoDB instance (local or MongoDB Atlas connection string)

### 1. Backend Server Setup
```bash
cd backend
npm install
npx prisma generate
npm run dev
```
> The API server will start on `http://localhost:3000` (serving both API endpoints and the compiled mobile web assets).

### 2. Mobile App (Expo Web / Native)
```bash
cd mobile
npm install
# Run interactive Expo dev server
npm start

# Or export the production static web bundle:
npm run build
```

---

## 🧪 Testing

Run test suites across both repositories:

```bash
# Backend unit & integration tests
cd backend && npm test

# Mobile components & store tests
cd mobile && npm test
```

---

## 🚢 Production Deployment

- **Frontend Static App**: Deployed via Netlify or Render Static Site (`buildCommand: cd mobile && npm install && npm run build`, `publish: mobile/dist`).
- **Backend API Service**: Deployed on Render Web Service or AWS App Runner (`buildCommand: cd backend && npm install && npx prisma generate && npm run build`, `startCommand: cd backend && node dist/index.js`).
- **Environment Variables**:
  - `DATABASE_URL`: MongoDB Atlas connection string.
  - `JWT_SECRET`: Cryptographic token secret.
  - `PORT`: HTTP port (defaults to `3000`).
  - `EXPO_PUBLIC_API_URL`: Public API URL for web/mobile requests.

---

## 🔄 Dual Repository Sync

This project maintains synchronized branches across two Git remotes:
- **`origin`**: `https://github.com/SRavanga-AI-Smart-Solutions/Biome-App1.git`
- **`renu-app`**: `https://github.com/jayantheede/Renu-App.git`

To ensure parity, changes committed to `main` must be merged into `dev` and pushed to both remotes:
```bash
git push origin main dev
git push renu-app main dev
```

---

## 📄 License
Proprietary software developed by **SRavanga AI Smart Solutions** for **ReNu-Biome Inc.** All rights reserved.

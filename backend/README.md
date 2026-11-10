# ReNu-Biome Backend API Service

The core server application powering the **ReNu-Biome Agricultural Operations & Grower Portal**, built with Node.js, Express, TypeScript, and Prisma ORM with MongoDB Atlas persistence.

---

## 🚀 Key Integrations & Services

1. **OptimoRoute API Integration (`src/optimoRouteService.ts`)**:
   - Automated delivery order dispatching and live driver tracking.
   - Dual authentication support (API key in query string and Basic Auth header).
2. **Otodata Cellular Tank Telemetry (`src/otodataService.ts`)**:
   - Real-time tank sensor synchronization across primary Central Valley telemetry endpoints.
   - Automatic low-level alerts when tank capacity falls below 25%.
3. **Automated Branded Email Workflows (`src/orderEmailService.ts`)**:
   - New user credentials notification with temporary password.
   - Password reset alerts.
   - Customer account approval and status change emails.
   - Order confirmation and live delivery status updates.
   - Lab assay results ready alerts.
   - QuickBooks invoice generation and receipt statements.

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Start Development Server
```bash
npm run dev
```
*The server starts on `http://localhost:3000`.*

### 4. Run Test Suite
```bash
npm test
```
*Runs 36 comprehensive end-to-end, telemetry, and integration tests.*

---

## 📦 Production Build
```bash
npm run build
node dist/index.js
```


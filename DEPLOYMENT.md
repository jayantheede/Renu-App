# ReNu-Biome Deployment Guide (Phase 14)

This guide covers the deployment strategy for both the backend API and the React Native frontend (exported as a web app for Netlify).

## 1. Environment Configuration
Ensure you have the following configurations injected into your production environment (do NOT commit secrets).

**Backend `.env.example`**:
```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/renubiome?retryWrites=true&w=majority"
JWT_SECRET="generate-a-strong-secret-key-here"
SMTP_USER="no-reply@renubiome.com"
SMTP_PASS="secure-smtp-password"
PORT=3000
RAZORPAY_KEY_ID="sandbox_or_live_key"
RAZORPAY_KEY_SECRET="sandbox_or_live_secret"
```

**Frontend `mobile/.env.example`**:
```env
EXPO_PUBLIC_API_URL="https://api.renubiome.com/api/app"
```

## 2. Backend Deployment (Node.js/Express)
The backend should be deployed to a scalable container service like Render, Heroku, or AWS App Runner.

1. Provision a MongoDB Atlas cluster.
2. Add the `DATABASE_URL` to the host environment variables.
3. Run Prisma generation and schema push before starting:
   ```bash
   npx prisma generate
   npm run build # (if using tsc)
   node dist/index.js
   ```
4. Configure health checks to ping `GET /api/app/cto/system-health`.

## 3. Frontend Deployment (Netlify Web)
The Expo React Native app can be exported to a standard static web bundle.

1. Inside `/mobile`, build for the web:
   ```bash
   npx expo export -p web
   ```
2. Netlify Configuration (`netlify.toml`):
   ```toml
   [build]
     command = "npx expo export -p web"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
3. Ensure SPA route fallback is active (the `[[redirects]]` block above handles this, preventing 404s on deep links).

## 4. Rollback & Troubleshooting
- **Database Rollbacks**: Since MongoDB is schemaless at the db level, Prisma manages the schema safely. Restore from Atlas automated backups in case of catastrophic data deletion.
- **Frontend SPA 404s**: Always verify `netlify.toml` is present in the root directory being published so client-side routing holds.
- **Auth Errors**: Verify `JWT_SECRET` is exactly the same across backend restarts.

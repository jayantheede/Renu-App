# ReNu-Biome Production & Mobile Deployment Guide

This guide details how to deploy the ReNu-Biome Agricultural Operations platform across **Web / PWA (Render)** and **Native Mobile (iOS & Android via Expo EAS)**.

---

## 1. Architecture Overview

- **Backend API**: Node.js + Express + TypeScript running on Render Web Service (`api.renu-biome.com`).
- **Web App / PWA**: React Native Web static export hosted on Render Static Site or served from backend (`app.renu-biome.com`).
- **Native Mobile Apps**: Built natively for iOS (`.ipa`) and Android (`.apk` / `.aab`) directly from the `mobile` codebase using Expo EAS (no Flutter rewrite required).

---

## 2. Web & PWA Deployment (Render)

Per the **November 2 Handover Specification**:

### Step 1: Export Frontend Static Bundle
```bash
cd mobile
EXPO_NO_TELEMETRY=1 npx expo export -p web
```
The output is generated in `mobile/dist`.

### Step 2: Render Configuration
- **Backend Service**:
  - Environment: Node
  - Build Command: `cd backend && npm install && npx prisma generate`
  - Start Command: `cd backend && npm start`
  - Domain: `api.renu-biome.com`
- **Static Frontend** (or served by backend):
  - Publish directory: `mobile/dist`
  - Domain: `app.renu-biome.com`

### Step 3: DNS Records (Microsoft 365 Admin Center)
Add three CNAME records in the Microsoft 365 Admin Center for `renu-biome.com`:
- `app` → Render Web/Static service CNAME
- `api` → Render Backend service CNAME
- Render verification TXT/CNAME record

---

## 3. Native Mobile Deployment (iOS & Android via EAS)

The `mobile/app.json` and `mobile/eas.json` files are configured to produce native mobile binaries.

### Prerequisites
Install the official Expo EAS CLI globally:
```bash
npm install -g eas-cli
```

### Option A: Generate Direct Installable Android APK (Testing without Google Play)
To generate an `.apk` file that growers, drivers, or office staff can immediately download and install on any Android phone:
```bash
cd mobile
eas login
eas build -p android --profile preview
```
EAS builds the standalone APK in the cloud and provides a direct download link and QR code.

### Option B: Build for Google Play Store (Production Android)
To produce an optimized Android App Bundle (`.aab`):
```bash
cd mobile
eas build -p android --profile production
```
Upload the resulting `.aab` to Google Play Console under Internal Testing or Production.

### Option C: Build for Apple App Store & TestFlight (iOS)
To produce an official signed iOS archive (`.ipa`):
```bash
cd mobile
eas build -p ios --profile production
```
*Requires an Apple Developer Account ($99/yr). EAS will guide you through connecting your Apple Team ID and signing certificates automatically.*

### Option D: Immediate Testing on Physical Phones (Expo Go)
For real-time development and client demos without building binaries:
1. Install **Expo Go** from the App Store (iOS) or Google Play (Android).
2. Start the dev bundler:
   ```bash
   cd mobile
   npx expo start
   ```
3. Scan the terminal QR code with your phone camera (iOS Safari or Android Expo Go app). The live app loads instantly with native performance.

---

## 4. PWA 1-Tap Mobile Install (No App Store Needed)

For B2B commercial growers, the app can be installed directly from the web browser without app store review delays:
- Navigate to `https://app.renu-biome.com/install` (or scan the 300 DPI QR code).
- **iPhone / iPad (Safari)**: Tap **Share** (square with up arrow) → Tap **Add to Home Screen**.
- **Android (Chrome)**: Tap **Install app** button or browser menu (⋮) → **Add to Home screen**.
- Once installed, it launches full screen with the official ReNu-Biome logo and offline cache support.

---

## 5. Production Environment Variables Reference

Configure these in the Render Team Dashboard (**Never commit to Git**):

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `PORT` | Backend listen port | `3000` |
| `DATABASE_URL` | MongoDB Atlas Connection String | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signed JWT tokens | Strong 64-char random string |
| `SMTP_HOST` | Microsoft 365 Exchange SMTP host | `smtp.office365.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | Office mailbox | `support@renu-biome.com` |
| `SMTP_PASS` | Microsoft 365 Password or App Password | M365 credential |
| `OPTIMOROUTE_API_KEY` | OptimoRoute dispatch API key | API key from OptimoRoute |
| `OTODATA_API_KEY` | Otodata Nee-Vo cellular telemetry key | Provided by Otodata |
| `NODE_ENV` | Environment mode | `production` |

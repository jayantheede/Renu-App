# Renu Biome Customer Portal

A complete, production-ready cross-platform mobile app (iOS + Android) built with React Native (Expo) and TypeScript. It serves as a companion portal for Renu Biome customers (growers/distributors) to view orders, track product utilization, and manage payments.

## Architecture

- **Frontend**: Expo SDK (React Native), React Navigation, Zustand (state management), React Native Paper (Material UI styling).
- **Backend**: Node.js/Express proxy for Shopify Admin API.
- **Database**: MongoDB via Prisma ORM (for Utilization Tracking logs which do not natively exist in Shopify).

> **Assumptions**: 
> - New customers must register via the Shopify website. This app is strictly for existing customers who already have Shopify credentials.
> - The backend API is assumed to be running alongside the app during development.
> - You'll need to create a real `.env` file from `.env.example` to connect to Shopify.

## Setup Instructions

### 1. Database & Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start a local MongoDB instance (or use Atlas) and set your `DATABASE_URL` in `.env`.
5. Run Prisma generate to initialize the Prisma Client:
   ```bash
   npx prisma generate
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```
*(The backend will run on `http://localhost:3000`)*

### 2. Mobile App Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm start
   ```
4. Follow the Expo CLI instructions to open the app on an iOS simulator (`i`) or Android emulator (`a`).

## Connecting to a Shopify Dev Store

To test with real Shopify data, you will need to:
1. Create a Shopify Partner account and a Development Store.
2. Generate a **Headless App** token (Storefront API) for the mobile app to fetch catalog items.
3. Generate a **Custom App** token (Admin API) for the backend to fetch order history and proxy requests.
4. Add these tokens to your respective `.env` files (Mobile and Backend).

## Building for Production (EAS)

We use Expo Application Services (EAS) for building the native iOS and Android binaries.

1. Install EAS CLI: `npm install -g eas-cli`
2. Login to your Expo account: `eas login`
3. Configure the project: `eas build:configure`
4. Build for iOS: `eas build --platform ios`
5. Build for Android: `eas build --platform android`

Once complete, EAS will provide a link to download the `.ipa` (iOS) or `.aab` (Android) files for App Store/Play Store submission.

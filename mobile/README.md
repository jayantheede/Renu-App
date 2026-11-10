# ReNu-Biome Mobile Application (React Native / Native JS)

The official cross-platform mobile client for the **ReNu-Biome Agricultural Operations & Grower Portal**, built with React Native (Expo SDK 57), TypeScript, and native iOS / Android toolchains.

---

## 📱 App Store & Google Play Configuration

| Platform | Identifier / Package | Version | Build Number / VersionCode |
| :--- | :--- | :--- | :--- |
| **iOS** | `com.renubiome.app` | `1.0.0` | `1` |
| **Android** | `com.renubiome.app` | `1.0.0` | `1` |
| **Apple Developer Team** | `Radhika Gundavelli (63D9SK6N3M)` | — | — |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally in Development
```bash
# Start interactive Expo CLI (scan QR code in Expo Go or run simulator)
npm start

# Run native iOS simulator / device
npm run ios

# Run native Android emulator / device
npm run android

# Run web browser client
npm run web
```

### 3. Run Jest Test Suite
```bash
npm test
```
*Runs 17 component, store, and DOM integration tests.*

---

## 🍎 iOS Deployment (Apple App Store & TestFlight)

### Method 1: One-Command Cloud Build (EAS CLI)
```bash
# Build production IPA and submit directly to Apple TestFlight
npx eas-cli build --platform ios --profile production --auto-submit
```

### Method 2: Native Build via Xcode
1. Open the native workspace:
   ```bash
   open ios/ReNuBiome.xcworkspace
   ```
2. In Xcode:
   - Select **ReNuBiome** target &rarr; **Signing & Capabilities**.
   - Check **"Automatically manage signing"** and select Team: **`Radhika Gundavelli`**.
   - Target device: **"Any iOS Device (arm64)"**.
   - Go to menu: **Product &rarr; Archive**.
   - In Organizer, click **"Distribute App"** &rarr; **"App Store Connect"** &rarr; **"Upload"**.

### Method 3: Drag & Drop via Apple Transporter App
1. Build `.ipa` locally or via EAS.
2. Open **Transporter** (free from Mac App Store).
3. Drag and drop the `.ipa` into Transporter &rarr; click **Deliver**.

---

## 🤖 Android Deployment (Google Play Store)

```bash
# Production App Bundle (.aab) for Google Play Console:
npx eas-cli build --platform android --profile production --auto-submit

# Direct preview APK for testing on physical Android devices:
npx eas-cli build --platform android --profile preview
```

---

## ⚙️ Automated GitHub Actions CI/CD

- **iOS TestFlight Workflow**: [`.github/workflows/ios-testflight.yml`](../.github/workflows/ios-testflight.yml)
- **Google Play Workflow**: [`.github/workflows/android-playstore.yml`](../.github/workflows/android-playstore.yml)
- **CI Pipeline**: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Trigger manual builds from the **Actions** tab in GitHub or by pushing a release tag (`v1.0.0`).

---

## 📁 Directory Structure

```
mobile/
├── android/              # Native Android Gradle project (com.renubiome.app)
├── ios/                  # Native iOS Xcode workspace (com.renubiome.app)
├── assets/brand/         # ReNu-Biome logos, high-res app icons (1024x1024)
├── src/
│   ├── api/              # Universal HTTP API client with offline caching
│   ├── components/       # UI elements (Cards, Buttons, Modals, Maps)
│   ├── navigation/       # React Navigation 7 tabs and stacks
│   ├── screens/          # 17 application screens (Grower, Admin, Driver, etc.)
│   └── store/            # Zustand global state (auth, ranches, tanks)
├── app.json              # Expo application manifest
├── eas.json              # EAS Build release profiles
└── package.json
```


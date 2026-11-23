# How to Build and Submit ReNu-Biome to Google Play Store

This guide details the three methods to build the production Android App Bundle (`.aab`) and submit it to the Google Play Console.

---

## Method 1: One-Click Cloud Build via EAS (Recommended)

Expo Application Services (EAS) automatically builds the release `.aab` in a clean cloud container using Java 17 and Android SDK 34, then can automatically upload it directly to Google Play.

### Steps:
1. Log into your Expo account:
   ```bash
   cd mobile
   npx eas-cli login
   ```

2. Build the production Android App Bundle:
   ```bash
   npx eas-cli build --platform android --profile production
   ```
   *EAS will generate `app-release.aab` and provide a direct download link.*

3. (Optional) Auto-submit directly to Google Play Console:
   ```bash
   npx eas-cli submit --platform android --latest
   ```

---

## Method 2: GitHub Actions Automated Pipeline

The repository already includes a pre-configured GitHub Actions workflow:
`.github/workflows/android-playstore.yml`

### Steps:
1. Go to your GitHub repository: `https://github.com/SRavanga-AI-Smart-Solutions/Biome-App1/actions`
2. Select **"Android Google Play Deployment"**.
3. Click **"Run workflow"**:
   - Profile: `production`
   - Auto-submit: `true` (or `false` to just download the AAB)
   - Track: `internal` (or `production`)
4. Download the generated `.aab` artifact or let the workflow submit it directly using your `EXPO_TOKEN` secret.

---

## Method 3: Local Build via Gradle / Android Studio

If you prefer building locally:

1. **Prerequisites**:
   - Install OpenJDK 17 (`brew install openjdk@17` or download from [adoptium.net](https://adoptium.net/))
   - Android SDK (API 34) or Android Studio.

2. **Build the Release Android App Bundle (`.aab`)**:
   ```bash
   cd mobile/android
   ./gradlew bundleRelease
   ```
   Output file:
   `mobile/android/app/build/outputs/bundle/release/app-release.aab`

3. **Or Build a Standalone Release APK (`.apk`)**:
   ```bash
   cd mobile/android
   ./gradlew assembleRelease
   ```
   Output file:
   `mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## Uploading to Google Play Console

1. Navigate to [Google Play Console](https://play.google.com/console).
2. Click **Create app**:
   - App Name: `ReNu-Biome`
   - Default Language: `English (United States)`
   - App or game: `App`
   - Free or paid: `Free`
3. Upload Assets from `playstore_assets/`:
   - **App Icon**: `playstore_assets/app_icon_512x512.png`
   - **Feature Graphic**: `playstore_assets/feature_graphic_1024x500.png`
   - **Phone Screenshots**: Upload all 8 images from `playstore_assets/screenshots/`
4. Copy & Paste Listing Text from `playstore_assets/STORE_LISTING_METADATA.md`:
   - Short Description & Full Description
   - Privacy Policy URL: `https://biome-app1.onrender.com/privacy-policy.html`
   - Account Deletion URL: `https://biome-app1.onrender.com/app-review-demo.html`
5. Set App Access Credentials (for Google Reviewer):
   - Demo Email: `customer@renu.com`
   - Password: `customer`
   - 2FA Code: `123456`
6. Create Release on **Internal Testing** or **Production** track:
   - Upload the generated `app-release.aab`
   - Review release details and click **Save & Submit for review**!

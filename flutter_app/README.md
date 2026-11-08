# ReNu-Biome Grower Portal - Flutter Mobile Client

This directory contains the Flutter companion implementation for the ReNu-Biome Grower Portal, configured to match the production React Native (Native JS) application.

## Bundle Identifier & Package Name
- **iOS Bundle Identifier**: `com.renubiome.portal`
- **Android Package Name**: `com.renubiome.portal`
- **Version**: `1.0.0`
- **Build Number / VersionCode**: `1`

## Building for App Store & Google Play Store
### 1. iOS App Store / TestFlight
```bash
flutter pub get
flutter build ipa --release
```
The resulting `.ipa` in `build/ios/archive/Runner.xcarchive` can be uploaded via Transporter or Xcode to App Store Connect / TestFlight.

### 2. Google Play Store (Android App Bundle)
```bash
flutter pub get
flutter build appbundle --release
```
The resulting `.aab` in `build/app/outputs/bundle/release/app-release.aab` can be uploaded to Google Play Console.

#!/usr/bin/env bash
set -euo pipefail

echo "=== Building ReNu-Biome Universal Mac App Store Package ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="ReNu-Biome"
APP_DIR="${APP_NAME}.app"
PKG_NAME="${APP_NAME}.pkg"
KEYCHAIN="/private/tmp/macbuild.keychain"

# 1. Unlock keychain
security unlock-keychain -p "buildpass123" "$KEYCHAIN"

# 2. Compile Universal (Apple Silicon + Intel) Swift binaries
echo "Compiling native Swift binary for arm64..."
rm -f ReNu-Biome-arm64 ReNu-Biome-x86_64 "$APP_NAME"
swiftc -O -target arm64-apple-macos12.0 main.swift -o ReNu-Biome-arm64 -framework Cocoa -framework WebKit

echo "Compiling native Swift binary for x86_64..."
swiftc -O -target x86_64-apple-macos12.0 main.swift -o ReNu-Biome-x86_64 -framework Cocoa -framework WebKit

echo "Creating Universal binary with lipo..."
lipo -create -output "$APP_NAME" ReNu-Biome-arm64 ReNu-Biome-x86_64
rm -f ReNu-Biome-arm64 ReNu-Biome-x86_64

# 3. Assemble .app bundle
echo "Assembling ${APP_DIR}..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

mv "$APP_NAME" "$APP_DIR/Contents/MacOS/$APP_NAME"
cp AppIcon.icns "$APP_DIR/Contents/Resources/AppIcon.icns"
cp embedded.provisionprofile "$APP_DIR/Contents/embedded.provisionprofile"

cat << 'PLIST' > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ReNu-Biome</string>
    <key>CFBundleIdentifier</key>
    <string>com.renubiome.app</string>
    <key>CFBundleName</key>
    <string>ReNu-Biome</string>
    <key>CFBundleDisplayName</key>
    <string>ReNu-Biome</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>10</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.business</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>ITSAppUsesNonExemptEncryption</key>
    <false/>
</dict>
</plist>
PLIST

# 4. Sign the app bundle
echo "Codesigning app bundle with Apple Distribution identity and entitlements..."
codesign --force --verify --verbose \
  --sign "Apple Distribution: Radhika Gundavelli (63D9SK8N3M)" \
  --entitlements entitlements.plist \
  --keychain "$KEYCHAIN" \
  --options runtime \
  "$APP_DIR"

echo "Verifying app signature..."
codesign --verify --deep --strict --verbose=2 "$APP_DIR"

# 5. Build signed installer package for Mac App Store
echo "Building signed Mac App Store installer package with productbuild..."
rm -f "$PKG_NAME"
productbuild \
  --component "$APP_DIR" /Applications \
  --sign "3rd Party Mac Developer Installer: Radhika Gundavelli (63D9SK8N3M)" \
  --keychain "$KEYCHAIN" \
  "$PKG_NAME"

echo "Universal Package created successfully: ${PKG_NAME}"
ls -lh "$PKG_NAME"

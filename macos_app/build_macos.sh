#!/usr/bin/env bash
set -euo pipefail

echo "=== Building ReNu-Biome Native macOS Desktop App ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="ReNu-Biome"
APP_DIR="${APP_NAME}.app"
DMG_NAME="${APP_NAME}-macOS.dmg"

# 1. Compile Swift executable
echo "Compiling native Swift binary..."
swiftc -O -target arm64-apple-macos11.0 main.swift -o "$APP_NAME" -framework Cocoa -framework WebKit

# 2. Package .app bundle
echo "Packaging ${APP_DIR}..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

mv "$APP_NAME" "$APP_DIR/Contents/MacOS/$APP_NAME"
cp AppIcon.icns "$APP_DIR/Contents/Resources/AppIcon.icns"

cat << 'PLIST' > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ReNu-Biome</string>
    <key>CFBundleIdentifier</key>
    <string>com.renubiome.macos</string>
    <key>CFBundleName</key>
    <string>ReNu-Biome</string>
    <key>CFBundleDisplayName</key>
    <string>ReNu-Biome</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>8</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

# 3. Ad-hoc code sign
echo "Signing bundle..."
codesign --force --deep --sign - "$APP_DIR"

# 4. Create DMG
echo "Generating ${DMG_NAME}..."
rm -f "$DMG_NAME"
hdiutil create -volname "$APP_NAME" -srcfolder "$APP_DIR" -ov -format UDZO "$DMG_NAME"

echo "Build complete: $(pwd)/${DMG_NAME}"


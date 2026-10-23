#!/usr/bin/env bash
# Build Shivshakti UPVC for iOS (Mac + Xcode required)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building web app..."
npm run build

echo "Syncing Capacitor iOS..."
npx cap sync ios

if command -v pod >/dev/null 2>&1; then
  echo "Installing CocoaPods dependencies..."
  (cd ios/App && pod install)
else
  echo "Warning: CocoaPods not installed. Run: sudo gem install cocoapods"
fi

echo ""
echo "Open Xcode to build/run:"
echo "  npx cap open ios"
echo ""
echo "Then: select device or simulator → Run (▶), or Product → Archive for IPA."

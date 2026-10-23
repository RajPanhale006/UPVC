# Shivshakti UPVC — Mobile App (Android + iOS, offline)

The mobile app runs **fully offline** after install. Cutting calculator, calibration, estimation, and profile settings all work without internet. Data is stored on the device (localStorage).

| Platform | Build on Windows | Build on Mac |
|----------|------------------|--------------|
| **Android APK** | Yes | Yes |
| **iOS IPA** | No (needs Mac + Xcode) | Yes |

---

## App details

| Item | Value |
|------|--------|
| App name | Shivshakti UPVC |
| Package / Bundle ID | `com.shivshakti.upvcworkshop` |
| Company | Shivshakti Enterprises |
| Internet | Not required after install |

---

## Quick build — Android (Windows)

### 1. One-time setup

```powershell
cd "d:\Nimesh\Nimesh Cursor\NEW UPVC"
powershell -ExecutionPolicy Bypass -File scripts\setup-android-build.ps1
```

Installs JDK 21 + Android SDK to your user folder (no admin).

### 2. Build APK

```powershell
scripts\build-apk.bat
```

**Output:** `android\app\build\outputs\apk\debug\app-debug.apk`

First build may take **10–20 minutes** (Gradle downloads).

### 3. Install on phones

Copy APK to phone → open → allow **Install from unknown sources** → install.

---

## Quick build — iOS (Mac only)

You need a **Mac** with **Xcode** and **CocoaPods**:

```bash
# One-time on Mac
sudo gem install cocoapods
xcode-select --install

cd "/path/to/NEW UPVC"
npm install
npm run build:ios
cd ios/App
pod install
cd ../..
npx cap open ios
```

In Xcode:

1. Select your **Team** (Apple Developer account) under Signing & Capabilities.
2. Product → **Archive** → Distribute (Ad Hoc / TestFlight / App Store).

Or run on a connected iPhone: select device → **Run** (▶).

**Offline:** The app bundles all web files in the IPA — no server needed on the phone.

---

## After code changes

Always rebuild the web app and sync native projects:

```powershell
npm run build:mobile
```

Or platform-specific:

```powershell
npm run build:android
npm run build:ios
```

Then rebuild the native app (APK in Android Studio / Gradle, or Archive in Xcode).

---

## PDF on mobile

- **Export PDF** → share sheet → save to **Downloads** / Files / WhatsApp.
- **Import PDF** → pick a PDF exported from this app (cutting or calibration).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Old UI on phone | Run `npm run build:android` then rebuild APK |
| Gradle fails / abc_alert_dialog errors | Delete `%USERPROFILE%\.gradle\caches` OR use `scripts\build-apk.bat` (uses `C:\ShivshaktiUPVC\gradle-home`) |
| iOS pod install fails | On Mac: `cd ios/App && pod install` |
| White screen | Ensure `npm run build` succeeded and `out/` folder exists |

---

See also: [ANDROID.md](./ANDROID.md) for detailed Android SDK paths.

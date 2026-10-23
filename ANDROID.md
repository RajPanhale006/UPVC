# Shivshakti UPVC — Android APK (team install)

> **Also available:** iOS build on Mac — see [MOBILE.md](./MOBILE.md).

> **Want installed apps to update after `git push`?** See **[LIVE_MOBILE.md](./LIVE_MOBILE.md)** (`npm run build:apk:live` + Vercel).

## Offline APK (default)

This build runs **fully offline** on Android. All cutting, estimation, and profile data is stored on the phone. Updates require a **new APK** install.

## One-time setup (no admin needed)

Open PowerShell in the project folder:

```powershell
cd "d:\Nimesh\Nimesh Cursor\NEW UPVC"
powershell -ExecutionPolicy Bypass -File scripts\setup-android-build.ps1
```

This installs to your user folder (no administrator prompt):

| Tool | Location |
|------|----------|
| Java JDK 21 | `%LOCALAPPDATA%\ShivshaktiAndroidBuild\jdk-21` |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` |

Takes **5–15 minutes** (downloads JDK + SDK).

### Alternative: Android Studio (with admin)

If you prefer the full IDE, install from [developer.android.com/studio](https://developer.android.com/studio) or:

```powershell
winget install Google.AndroidStudio --accept-package-agreements --accept-source-agreements
```

(Requires approving the Windows administrator prompt.)

---

## Build the APK

```powershell
cd "d:\Nimesh\Nimesh Cursor\NEW UPVC"
npm run build:apk
```

Or:

```powershell
scripts\build-apk.bat
```

Or manually:

```powershell
npm run build:android
cd android
$env:JAVA_HOME = "$env:LOCALAPPDATA\ShivshaktiAndroidBuild\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew assembleDebug
```

**APK output:** `android\app\build\outputs\apk\debug\app-debug.apk`

First Gradle build may take **10–20 minutes** (downloads dependencies).

---

## Install on team phones

1. Copy `app-debug.apk` to the phone (USB, WhatsApp, etc.)
2. Open the file → allow **Install from unknown sources**
3. Install — no Play Store needed

---

## PDF on Android

Export PDF → Android share sheet → save to **Downloads** or WhatsApp.

---

## App details

| Item | Value |
|------|--------|
| App name | Shivshakti Enterprises |
| Package | com.shivshakti.upvcworkshop |
| Company | Shivshakti Enterprises |
| Internet | Not required after install |


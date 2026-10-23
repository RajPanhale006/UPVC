@echo off
REM Build Shivshakti UPVC debug APK (after setup-android-build.ps1)
setlocal
cd /d "%~dp0.."

if not exist "%LOCALAPPDATA%\ShivshaktiAndroidBuild\jdk-21\bin\java.exe" (
  if exist "%LOCALAPPDATA%\ShivshaktiAndroidBuild\jdk-17\bin\java.exe" (
    set "JAVA_HOME=%LOCALAPPDATA%\ShivshaktiAndroidBuild\jdk-17"
  ) else (
    echo Run setup first: powershell -ExecutionPolicy Bypass -File scripts\setup-android-build.ps1
    exit /b 1
  )
) else (
  set "JAVA_HOME=%LOCALAPPDATA%\ShivshaktiAndroidBuild\jdk-21"
)
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
REM Dedicated Gradle home avoids corrupted default cache breaking resource linking
if not exist "C:\ShivshaktiUPVC\gradle-home" mkdir "C:\ShivshaktiUPVC\gradle-home"
set "GRADLE_USER_HOME=C:\ShivshaktiUPVC\gradle-home"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo Building web app...
call npm run build
if errorlevel 1 exit /b 1

echo Syncing Capacitor Android...
call npx cap sync android
if errorlevel 1 exit /b 1

echo Building APK...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 exit /b 1

echo.
echo APK ready:
echo   android\app\build\outputs\apk\debug\app-debug.apk
endlocal

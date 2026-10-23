const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const isWin = process.platform === "win32";

function resolveJavaHome() {
  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || "";
    const jdk21 = path.join(localAppData, "ShivshaktiAndroidBuild", "jdk-21");
    const jdk17 = path.join(localAppData, "ShivshaktiAndroidBuild", "jdk-17");
    if (fs.existsSync(path.join(jdk21, "bin", "java.exe"))) return jdk21;
    if (fs.existsSync(path.join(jdk17, "bin", "java.exe"))) return jdk17;
  } else {
    const portableJdk21 = path.join(projectRoot, ".tooling", "jdk-21", "Contents", "Home");
    if (fs.existsSync(path.join(portableJdk21, "bin", "java"))) return portableJdk21;
    if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, "bin", "java"))) {
      return process.env.JAVA_HOME;
    }
    try {
      const result = spawnSync("/usr/libexec/java_home", ["-v", "21"], {
        encoding: "utf8",
      });
      if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
    } catch {
      // ignore
    }
  }
  return process.env.JAVA_HOME || "";
}

function resolveAndroidHome() {
  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || "";
    return path.join(localAppData, "Android", "Sdk");
  }
  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
    return process.env.ANDROID_HOME;
  }
  const macSdk = path.join(os.homedir(), "Library", "Android", "sdk");
  if (fs.existsSync(path.join(macSdk, "platform-tools"))) return macSdk;
  return process.env.ANDROID_SDK_ROOT || "";
}

const javaHome = resolveJavaHome();
if (!javaHome) {
  console.error(
    isWin
      ? "Java JDK not found. Run: powershell -ExecutionPolicy Bypass -File scripts/setup-android-build.ps1"
      : "Java JDK 21 not found. Install Temurin 21, set JAVA_HOME, or run scripts/ensure-jdk21-mac.sh",
  );
  process.exit(1);
}

const androidHome = resolveAndroidHome();
if (!fs.existsSync(path.join(androidHome, "platform-tools"))) {
  console.error(
    isWin
      ? "Android SDK not found. Run: powershell -ExecutionPolicy Bypass -File scripts/setup-android-build.ps1"
      : "Android SDK not found. Install Android Studio or set ANDROID_HOME to your SDK path.",
  );
  process.exit(1);
}

const pathSep = isWin ? ";" : ":";
const javaBin = path.join(javaHome, "bin");
const platformTools = path.join(androidHome, "platform-tools");

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: `${javaBin}${pathSep}${platformTools}${pathSep}${process.env.PATH || ""}`,
};

if (isWin) {
  const gradleHome = "C:\\ShivshaktiUPVC\\gradle-home";
  fs.mkdirSync(gradleHome, { recursive: true });
  env.GRADLE_USER_HOME = gradleHome;
}

const androidDir = path.join(projectRoot, "android");
const gradlew = isWin
  ? path.join(androidDir, "gradlew.bat")
  : path.join(androidDir, "gradlew");

function resolveGradleCommand() {
  if (isWin) return { cmd: "cmd.exe", args: ["/c", gradlew, "assembleDebug"] };

  const gradleUserHome = env.GRADLE_USER_HOME || path.join(os.homedir(), ".gradle");
  const wrapperDists = path.join(gradleUserHome, "wrapper", "dists", "gradle-8.11.1-all");
  if (fs.existsSync(wrapperDists)) {
    for (const hashDir of fs.readdirSync(wrapperDists)) {
      const gradleBin = path.join(
        wrapperDists,
        hashDir,
        "gradle-8.11.1",
        "bin",
        "gradle",
      );
      if (fs.existsSync(gradleBin)) {
        return { cmd: gradleBin, args: ["assembleDebug"] };
      }
    }
  }
  return { cmd: gradlew, args: ["assembleDebug"] };
}

const gradle = resolveGradleCommand();

console.log("Building Android APK...");
const result = isWin
  ? spawnSync(gradle.cmd, gradle.args, {
      cwd: androidDir,
      env,
      stdio: "inherit",
    })
  : spawnSync(gradle.cmd, gradle.args, {
      cwd: androidDir,
      env,
      stdio: "inherit",
    });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const apkPath = path.join(
  projectRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);

console.log(`\nAPK ready:\n  ${apkPath}`);

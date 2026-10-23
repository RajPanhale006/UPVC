import { spawnSync } from "node:child_process";
import path from "node:path";
import { loadDotEnv, requireCapacitorServerUrl } from "./load-dotenv.mjs";

const projectRoot = path.join(import.meta.dirname, "..");
const live = process.argv.includes("--live");

loadDotEnv(projectRoot);

const env = { ...process.env };
if (live) {
  requireCapacitorServerUrl();
  env.CAPACITOR_OFFLINE_BUILD = "1";
  console.log(
    `Live mobile build → loads ${env.CAPACITOR_SERVER_URL} when online (bundled copy as fallback)`,
  );
} else {
  env.CAPACITOR_OFFLINE_BUILD = "1";
  delete env.CAPACITOR_SERVER_URL;
  console.log("Offline mobile build (bundled in APK only)");
}

function run(label, cmd, args) {
  console.log(`\n> ${label}`);
  const result = spawnSync(cmd, args, { cwd: projectRoot, env, stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("Tesseract assets", process.execPath, [path.join(projectRoot, "scripts/copy-tesseract-assets.mjs")]);
run("Next.js build", "npm", ["run", "build"]);
run("Capacitor sync", "npx", ["cap", "sync", "android"]);

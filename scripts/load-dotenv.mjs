import fs from "node:fs";
import path from "node:path";

/** Loads .env.local then .env into process.env (does not override existing vars). */
export function loadDotEnv(projectRoot = path.join(import.meta.dirname, "..")) {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(projectRoot, name);
    if (!fs.existsSync(filePath)) continue;

    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function requireCapacitorServerUrl() {
  loadDotEnv();
  const url = process.env.CAPACITOR_SERVER_URL?.trim().replace(/\/$/, "");
  if (!url) {
    console.error(
      "CAPACITOR_SERVER_URL is missing.\n" +
        "Add it to .env.local (HTTPS URL where the app is hosted, e.g. Vercel).\n" +
        "Example: CAPACITOR_SERVER_URL=https://your-app.vercel.app",
    );
    process.exit(1);
  }
  if (!/^https:\/\//i.test(url)) {
    console.error("CAPACITOR_SERVER_URL must use HTTPS.");
    process.exit(1);
  }
  process.env.CAPACITOR_SERVER_URL = url;
  return url;
}

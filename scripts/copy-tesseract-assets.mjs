import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "tesseract");
const CORE_OUT = path.join(OUT, "core");
const LANG_OUT = path.join(OUT, "lang");
const WORKER_SRC = path.join(ROOT, "node_modules", "tesseract.js", "dist", "worker.min.js");
const CORE_SRC = path.join(ROOT, "node_modules", "tesseract.js-core");
const LANG_URL = "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz";
const LANG_FILE = path.join(LANG_OUT, "eng.traineddata.gz");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed (${response.statusCode}) for ${url}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(undefined);
        });
      })
      .on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(WORKER_SRC)) {
    throw new Error("tesseract.js not installed — run npm install");
  }

  fs.mkdirSync(CORE_OUT, { recursive: true });
  fs.mkdirSync(LANG_OUT, { recursive: true });

  copyFile(WORKER_SRC, path.join(OUT, "worker.min.js"));

  for (const name of fs.readdirSync(CORE_SRC)) {
    if (/^tesseract-core.*\.(wasm|js)$/.test(name)) {
      copyFile(path.join(CORE_SRC, name), path.join(CORE_OUT, name));
    }
  }

  if (!fs.existsSync(LANG_FILE)) {
    console.log("Downloading eng.traineddata.gz for offline OCR…");
    await downloadFile(LANG_URL, LANG_FILE);
  } else {
    console.log("Using cached eng.traineddata.gz");
  }

  console.log("Tesseract assets ready in public/tesseract/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

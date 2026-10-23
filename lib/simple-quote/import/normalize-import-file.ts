const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"]);

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

function extensionOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export function inferImportMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  const ext = extensionOf(file.name);
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "pdf") return "application/pdf";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "csv") return "text/csv";
  return file.type;
}

/** Android gallery/camera picks often omit MIME type — normalize before import. */
export function normalizeImportFile(file: File): File {
  const type = inferImportMimeType(file);
  const name =
    file.name?.trim() ||
    `import-${Date.now()}.${type.startsWith("image/") ? "jpg" : "bin"}`;

  if (type === file.type && file.name) return file;

  return new File([file], name, {
    type: type || "application/octet-stream",
    lastModified: file.lastModified,
  });
}

export function isExcelLikeFile(file: File): boolean {
  const type = inferImportMimeType(file);
  if (
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    type === "application/vnd.ms-excel" ||
    type === "text/csv" ||
    type === "application/csv"
  ) {
    return true;
  }
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
}

export function isPdfFile(file: File): boolean {
  const type = inferImportMimeType(file);
  return type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isImageFile(file: File): boolean {
  const type = inferImportMimeType(file);
  if (IMAGE_MIME_TYPES.has(type)) return true;
  return IMAGE_EXTENSIONS.has(extensionOf(file.name));
}

/** Camera/gallery on Android may return an empty MIME type with no extension. */
export function isLikelyImagePick(file: File): boolean {
  if (isImageFile(file)) return true;
  if (file.type || isExcelLikeFile(file) || isPdfFile(file)) return false;
  return file.size > 0;
}

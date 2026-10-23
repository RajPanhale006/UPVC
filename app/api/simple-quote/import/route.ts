import { NextResponse } from "next/server";

import type { ImportQuoteLine } from "@/lib/simple-quote/import/types";
import { detectProductTypeFromText } from "@/lib/simple-quote/import/detect-product-type";
import { parseTextToImportLines } from "@/lib/simple-quote/import/parse-text";

const VALID_TYPES = new Set([
  "2-track",
  "2.5-track",
  "3-track-2g1n",
  "3-track-3g",
  "single-door",
  "double-door",
  "fixed-frame",
]);

function sanitizeLines(raw: unknown): ImportQuoteLine[] {
  if (!Array.isArray(raw)) return [];

  const lines: ImportQuoteLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const width = Number(row.width);
    const height = Number(row.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      continue;
    }

    const unit = row.unit === "feet-inches" ? "feet-inches" : "mm";
    const quantity = Number(row.quantity);
    const typeRaw = String(row.type ?? row.productType ?? "");
    const productType = VALID_TYPES.has(typeRaw)
      ? (typeRaw as ImportQuoteLine["productType"])
      : detectProductTypeFromText(typeRaw || String(row.description ?? ""));

    lines.push({
      width,
      height,
      unit,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
      productType,
    });
  }

  return lines;
}

async function parseWithOpenAi(input: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ImportQuoteLine[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Image import needs OPENAI_API_KEY on the server. Use Excel/PDF, or add the API key in .env.",
    );
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const userContent: Array<Record<string, unknown>> = [];

  if (input.imageBase64 && input.mimeType) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
    });
  }

  userContent.push({
    type: "text",
    text:
      input.text ??
      "Extract every window/door line from this document image for a UPVC workshop quote.",
  });

  userContent.push({
    type: "text",
    text: `Return strict JSON only:
{
  "lines": [
    {
      "width": number,
      "height": number,
      "unit": "mm" | "feet-inches",
      "quantity": number,
      "type": "2-track" | "2.5-track" | "3-track-2g1n" | "3-track-3g" | "single-door" | "double-door" | "fixed-frame",
      "description": string
    }
  ]
}
Rules:
- Include every window/door size you can read.
- Prefer mm when the sheet uses millimetres.
- Default quantity to 1 when missing.
- Infer track/door type from labels when present.`,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract structured UPVC window and door quote rows from images or text. Never invent sizes.",
        },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("AI import failed. Try a clearer photo or use Excel/PDF.");
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content) as { lines?: unknown };
  return sanitizeLines(parsed.lines);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ message: "File is required." }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { message: "Upload an image for AI import. Excel and PDF import runs in the app." },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const lines = await parseWithOpenAi({
        imageBase64: buffer.toString("base64"),
        mimeType: file.type,
      });

      if (lines.length === 0) {
        return NextResponse.json(
          { message: "No sizes found in the image. Try a clearer photo or Excel/PDF." },
          { status: 422 },
        );
      }

      return NextResponse.json({ ok: true, lines, warnings: [] });
    }

    const body = (await request.json()) as { text?: string };
    if (!body.text?.trim()) {
      return NextResponse.json({ message: "Text is required." }, { status: 400 });
    }

    const localLines = parseTextToImportLines(body.text);
    const lines =
      localLines.length > 0 ? localLines : await parseWithOpenAi({ text: body.text });

    return NextResponse.json({ ok: true, lines, warnings: [] });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Import failed.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { parseAssistantCommandLocal } from "@/lib/assistant/parse-local";
import type { AssistantCommand } from "@/lib/assistant/types";

/** Server-side OpenAI structured parsing — API key never exposed to client. */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const body = (await request.json()) as { text?: string };

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const localFallback = parseAssistantCommandLocal(body.text);

    if (!apiKey) {
      return NextResponse.json({ command: localFallback });
    }

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

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
            content: `You parse Shivshakti ProERP workshop commands into JSON matching this schema:
{
  "intent": "create-product"|"update-measurement"|"update-configuration"|"calculate-estimation"|"get-result"|"save-product"|"open-module"|"generate-document"|"add-to-quotation"|"unknown",
  "productType": "window"|"single-door"|"double-door" (optional),
  "measurements": { "width": number, "height": number, "unit": "mm"|"feet-inches", "quantity": number } (optional),
  "configuration": object (optional),
  "targetModule": string (optional),
  "documentType": string (optional),
  "resultQuery": string (optional),
  "requiresConfirmation": boolean,
  "confidence": number 0-1
}
Never invent business values. Only parse user intent.`,
          },
          { role: "user", content: body.text },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ command: localFallback });
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ command: localFallback });
    }

    const parsed = JSON.parse(content) as AssistantCommand;
    return NextResponse.json({
      command: {
        ...parsed,
        rawText: body.text,
        requiresConfirmation: parsed.requiresConfirmation ?? false,
        confidence: parsed.confidence ?? 0.7,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid assistant request" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";

/** Email provider stub — configure RESEND_API_KEY, SMTP, or similar server-side. */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.EMAIL_API_KEY?.trim();
    const provider = process.env.EMAIL_PROVIDER?.trim();

    if (apiKey) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${apiKey}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = (await request.json()) as {
      to?: string;
      cc?: string;
      subject?: string;
      body?: string;
    };

    if (!body.to?.trim()) {
      return NextResponse.json({ error: "Recipient is required" }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json(
        {
          error:
            "Email provider not configured. Set EMAIL_PROVIDER and related credentials on the server.",
        },
        { status: 501 },
      );
    }

    // Provider integration point — do not add credentials to client code.
    return NextResponse.json(
      { error: `Email provider "${provider}" is not yet implemented.` },
      { status: 501 },
    );
  } catch {
    return NextResponse.json({ error: "Invalid email request" }, { status: 400 });
  }
}

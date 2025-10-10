// /api/fb/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const FB_PIXEL_ID = process.env.FB_PIXEL_ID!;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN!;
const FB_TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE;

function sha256(str?: string) {
  return str
    ? crypto.createHash("sha256").update(str.trim().toLowerCase()).digest("hex")
    : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const { eventId, email, url, fbc, fbp, value, currency } = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "";
    const userAgent = req.headers.get("user-agent") || "";

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          event_source_url: url,
          user_data: {
            em: sha256(email),
            client_ip_address: ip,
            client_user_agent: userAgent,
            ...(fbc && { fbc }),
            ...(fbp && { fbp }),
          },
          custom_data: {
            currency: currency || "USD",
            value: value || 0,
          },
        },
      ],
      ...(FB_TEST_EVENT_CODE ? { test_event_code: FB_TEST_EVENT_CODE } : {}),
    };

    const response = await fetch(
      `https://graph.facebook.com/v23.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const json = await response.json();

    console.log("✅ [FB CAPI] Purchase sent:", {
      eventId,
      email,
      value,
      fbtrace_id: json.fbtrace_id,
    });

    return NextResponse.json({ success: true, fbResponse: json });
  } catch (error: any) {
    console.error("❌ [FB CAPI] Purchase failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

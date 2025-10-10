import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const FB_PIXEL_ID = process.env.FB_PIXEL_ID!;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN!;
const FB_TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE;

// 🔒 SHA256 helper for Meta CAPI user matching
function sha256(str?: string) {
  return str
    ? crypto.createHash("sha256").update(str.trim().toLowerCase()).digest("hex")
    : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      email,
      url,
      fbc,
      fbp,
      fb_login_id,
      external_id,
      phone,
      zip,
      dob, // e.g. "1999-05-21"
      fn,  // first name
      ln,  // last name
      ct,  // city
      st,  // state / region
    } = body;

    // 🧠 Client context
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "";
    const userAgent = req.headers.get("user-agent") || "";

    // 🧩 Build user_data — only include non-empty hashed fields
    const user_data: Record<string, any> = {
      client_ip_address: ip,
      client_user_agent: userAgent,
      ...(email && { em: sha256(email) }),
      ...(phone && { ph: sha256(phone) }),
      ...(fn && { fn: sha256(fn) }),
      ...(ln && { ln: sha256(ln) }),
      ...(ct && { ct: sha256(ct) }),
      ...(st && { st: sha256(st) }),
      ...(zip && { zp: sha256(zip) }),
      ...(dob && { db: sha256(dob) }),
      ...(external_id && { external_id: sha256(external_id) }),
      ...(fbc && { fbc }),
      ...(fbp && { fbp }),
      ...(fb_login_id && { fb_login_id }),
    };

    // 🧱 Construct payload
    const payload = {
      data: [
        {
          event_name: "CompleteRegistration",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || crypto.randomUUID(),
          action_source: "website",
          event_source_url: url || "https://kalowrite.com",
          user_data,
          custom_data: {
            currency: "USD",
            value: 0,
          },
        },
      ],
      ...(FB_TEST_EVENT_CODE ? { test_event_code: FB_TEST_EVENT_CODE } : {}),
    };

    // 🌐 Send to Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const json = await response.json();

    // ✅ Log success or Meta warnings
    if (response.ok && json.events_received) {
      console.log(
        `${new Date().toISOString()} [info] ✅ [FB CAPI] Signup event sent`,
        {
          pixel_id: FB_PIXEL_ID,
          event_name: "CompleteRegistration",
          eventId,
          email,
          url,
          fbtrace_id: json.fbtrace_id,
          events_received: json.events_received,
          messages: json.messages,
        }
      );
    } else {
      console.warn(
        `${new Date().toISOString()} [warn] ⚠️ [FB CAPI] Signup event response`,
        json
      );
    }

    return NextResponse.json({ success: true, fbResponse: json });
  } catch (error: any) {
    console.error(
      `${new Date().toISOString()} [error] ❌ [FB CAPI] Signup event failed:`,
      error
    );
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

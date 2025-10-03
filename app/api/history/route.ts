// app/api/history/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * ✅ GET - fetch last 20 history items
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("history")
    .select("id, input_text, output_text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("❌ History fetch failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: data });
}

/**
 * ✅ POST - insert new history entry
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { input_text, output_text } = await req.json();

    if (!input_text || !output_text) {
      return NextResponse.json({ error: "Missing input or output text" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("history").insert({
      user_id: userId,
      input_text,
      output_text,
    });

    if (error) {
      console.error("❌ History insert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ POST /history error:", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * ✅ DELETE - clear all history for user
 */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseAdmin.from("history").delete().eq("user_id", userId);

  if (error) {
    console.error("❌ History delete failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

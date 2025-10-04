import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // ✅ Auth check
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ Fetch membership
    const { data, error } = await supabaseAdmin
      .from("membership")
      .select(
        `
        plan,
        billing_interval,
        scheduled_plan,
        scheduled_plan_effective_at,
        started_at,
        ends_at,
        active
      `
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    // ✅ If no record yet → assume Free Plan
    if (!data) {
      return NextResponse.json({
        plan: "free",
        billing_interval: "monthly",
        scheduled_plan: null,
        scheduled_plan_effective_at: null,
        active: false,
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ /api/membership error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

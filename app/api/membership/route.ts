// app/api/membership/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("membership")
      .select(`
        plan,
        billing_interval,
        scheduled_plan,
        scheduled_plan_effective_at,
        started_at,
        ends_at,
        active
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

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
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}

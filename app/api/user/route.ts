// app/api/user/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Map plans → request limits
const planRequestLimits: Record<string, number> = {
  free: 500,
  basic: 500,
  pro: 1500,
  ultra: 3000,
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ✅ Fetch user balance
    const { data, error } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words, plan")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("❌ Failed to fetch user balance:", error);
      return NextResponse.json(
        { error: "Failed to load user balance", balance: 0, plan: "free", requestLimit: 500 },
        { status: 500 }
      );
    }

    // ✅ If user has no row yet → create default free plan
    if (!data) {
      const defaultPlan = "free";
      const defaultBalance = 500; // free tier quota

      await supabaseAdmin.from("user_balance").upsert({
        user_id: userId,
        balance_words: defaultBalance,
        plan: defaultPlan,
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        balance: defaultBalance,
        plan: defaultPlan,
        requestLimit: planRequestLimits[defaultPlan],
      });
    }

    // ✅ Normal response
    return NextResponse.json({
      balance: data.balance_words ?? 0,
      plan: data.plan ?? "free",
      requestLimit: planRequestLimits[data.plan ?? "free"],
    });
  } catch (err) {
    console.error("❌ API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", balance: 0, plan: "free", requestLimit: 500 },
      { status: 500 }
    );
  }
}
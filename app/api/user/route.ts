// app/api/user/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_balance")
    .select("balance_words, plan")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ balance: data?.balance_words ?? 0, plan: data?.plan ?? "free" });
}

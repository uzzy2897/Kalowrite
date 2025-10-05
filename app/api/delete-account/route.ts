import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // your existing admin client

export async function POST() {
  try {
    // ✅ 1. Authenticated user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // ✅ 2. Delete from Supabase tables (if you store data there)
    // Example: remove user balance, history, membership, etc.
    await supabaseAdmin.from("user_balance").delete().eq("user_id", userId);
    await supabaseAdmin.from("history").delete().eq("user_id", userId);
    await supabaseAdmin.from("membership").delete().eq("user_id", userId);

    // ✅ 3. Delete user from Clerk
    const res = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Failed to delete user in Clerk: ${err}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Delete account error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

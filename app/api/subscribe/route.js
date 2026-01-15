export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request) {
	try {
		const sub = await request.json();

		// Зберігаємо підписку в Redis (множина "subs", щоб не було дублікатів)
		await kv.sadd("subs", JSON.stringify(sub));

		console.log("✅ New subscriber saved to Redis");
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("❌ Redis error:", error);
		return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
	}
}
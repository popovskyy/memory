export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Redis from "ioredis";

// Підключаємось до твого Redis
const redis = new Redis(process.env.REDIS_URL);

export async function POST(request) {
	try {
		const sub = await request.json();

		// Зберігаємо підписку в Redis (множина "subs")
		await redis.sadd("subs", JSON.stringify(sub));

		console.log("✅ New subscriber saved to Redis");
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("❌ Redis error:", error);
		return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
	}
}
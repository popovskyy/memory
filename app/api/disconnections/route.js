export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";

let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 2000, // 2 сек макс
			lazyConnect: true,
			retryStrategy: null
		});
		redisInstance.on("error", (e) => console.warn("Redis Error:", e.message));
	}
	return redisInstance;
}

export async function GET() {
	const redis = getRedis();

	try {
		if (!redis) return NextResponse.json({ data: [] });

		if (redis.status !== "ready" && redis.status !== "connecting") {
			redis.connect().catch(() => {});
		}

		// ТІЛЬКИ ЧИТАННЯ. Ніякого парсингу.
		// Якщо Cron не спрацював - значить даних немає.
		const cached = await redis.get("schedule_full_cache");

		if (cached) {
			const response = NextResponse.json(JSON.parse(cached));
			// Кешуємо на CDN на 5 хвилин
			response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
			return response;
		} else {
			return NextResponse.json({ data: [] });
		}

	} catch (err) {
		return NextResponse.json({ error: "Server Error", data: [] }, { status: 500 });
	}
}
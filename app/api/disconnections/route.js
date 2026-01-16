export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";

// Глобальне підключення
let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 2000,
			lazyConnect: true,
			retryStrategy: null
		});
		redisInstance.on("error", (e) => console.warn("Redis Error:", e.message));
	}
	return redisInstance;
}

export async function GET() {
	const redis = getRedis();
	let data = [];

	try {
		// 1. Читаємо Redis (його наповнює CRON)
		if (redis) {
			if (redis.status !== "ready" && redis.status !== "connecting") {
				await redis.connect().catch(() => {});
			}
			const cached = await redis.get("schedule_full_cache");
			if (cached) {
				const parsed = JSON.parse(cached);
				data = parsed.data || [];
			}
		}

		// 2. Формуємо відповідь
		const response = NextResponse.json({ data });

		// 🔥 ТУТ ФІКС: Забороняємо браузеру довбити сервер 🔥
		// public -> дозволено кешувати всім
		// max-age=300 -> Браузер (сафарі/хром), запам'ятай цей JSON на 300 сек (5 хв).
		// s-maxage=300 -> Vercel CDN, теж запам'ятай на 5 хв.
		// Тобто 5 хвилин телефон навіть не полізе в інтернет за цим файлом.
		response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');

		return response;

	} catch (err) {
		console.error("API Error:", err.message);
		return NextResponse.json({ error: "Server Error", data: [] }, { status: 500 });
	}
}
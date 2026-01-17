export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";
import Redis from "ioredis";

// Глобальне підключення
let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 3000,
			lazyConnect: true,
			retryStrategy: null
		});
		redisInstance.on("error", (e) => console.warn("Redis Error:", e.message));
	}
	return redisInstance;
}

export async function GET() {
	const redis = getRedis();
	let resultData = null;

	try {
		// --- ЕТАП 1: Redis (ШВИДКО) ---
		if (redis) {
			try {
				if (redis.status !== "ready" && redis.status !== "connecting") {
					await redis.connect().catch(() => {});
				}
				const cached = await redis.get("schedule_full_cache");
				if (cached) {
					resultData = JSON.parse(cached);
				}
			} catch (e) {
				console.warn("Redis skip:", e.message);
			}
		}

		// --- ЕТАП 2: Парсинг (ПЛАН Б) ---
		if (!resultData || !resultData.data || resultData.data.length === 0) {
			console.log("⚠️ Cache MISS. Fetching live data...");

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000);

			const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
				cache: "no-store",
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
				},
				signal: controller.signal
			});
			clearTimeout(timeoutId);

			if (!resp.ok) throw new Error("Source error");

			const html = await resp.text();
			const root = parse(html);
			const table = root.querySelector("table");

			if (!table) throw new Error("No table found");

			const rows = table.querySelectorAll("tr");
			const data = rows.map((row) =>
				row.querySelectorAll("td, th").map((col) => {
					// 🔥 ФІКС для нового сайту: шукаємо <p> всередині комірок
					const ps = col.querySelectorAll("p");
					// Якщо є <p>, склеюємо через пробіл, інакше беремо просто текст
					return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
				})
			).filter(r => r.length > 0); // Прибираємо пусті рядки

			resultData = { data };

			// 🔥 ЗБЕРІГАЄМО В REDIS на 3 хвилини (180 секунд) 🔥
			if (redis) {
				await redis.set("schedule_full_cache", JSON.stringify(resultData), "EX", 180);
				console.log("💾 Saved live data to Redis (3 min TTL)");
			}
		}

		// --- ЕТАП 3: Відповідь ---
		const response = NextResponse.json(resultData);

		// Браузер/CDN теж кешує лише на 3 хв (180 сек)
		response.headers.set('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=60');

		return response;

	} catch (err) {
		console.error("API Error:", err.message);
		return NextResponse.json({ error: "Server Error", data: [] }, { status: 500 });
	}
}
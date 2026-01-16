export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";
import Redis from "ioredis";

// Підключення до Redis (Singleton)
let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 5000, // Даємо більше часу на з'єднання
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
		// 1. Спроба взяти з Redis (ШВИДКО)
		if (redis) {
			try {
				if (redis.status !== "ready" && redis.status !== "connecting") {
					await redis.connect().catch(() => {});
				}
				const cached = await redis.get("schedule_full_cache");
				if (cached) {
					console.log("🚀 Cache HIT: Returning data from Redis");
					resultData = JSON.parse(cached);
				}
			} catch (e) {
				console.warn("Redis skip:", e.message);
			}
		}

		// 2. Якщо кеш пустий — ПАРСИМО САЙТ (ПОВІЛЬНО, АЛЕ НАДІЙНО)
		if (!resultData || !resultData.data || resultData.data.length === 0) {
			console.log("⚠️ Cache MISS. Scraping live site...");

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 сек макс

			const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
				cache: "no-store",
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
				},
				signal: controller.signal
			});
			clearTimeout(timeoutId);

			if (!resp.ok) throw new Error(`Source error: ${resp.status}`);

			const html = await resp.text();
			const root = parse(html);
			const table = root.querySelector("#fetched-data-container table");

			if (!table) throw new Error("Table structure changed or not found");

			const rows = table.querySelectorAll("tr");
			const data = rows.map((row) =>
				row.querySelectorAll("td, th").map((col) => col.text.trim())
			);

			resultData = { data };

			// 🔥 ЗБЕРІГАЄМО В REDIS (Щоб наступний раз було швидко) 🔥
			if (redis) {
				// Зберігаємо на 1 годину (3600 сек)
				await redis.set("schedule_full_cache", JSON.stringify(resultData), "EX", 3600);
				console.log("💾 Saved scraped data to Redis successfully");
			}
		}

		// 3. Віддаємо відповідь
		const response = NextResponse.json(resultData);

		// Додаємо кешування Vercel CDN на 5 хвилин
		response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

		return response;

	} catch (err) {
		console.error("API Critical Error:", err.message);
		return NextResponse.json({ error: "Service Unavailable", details: err.message }, { status: 500 });
	}
}
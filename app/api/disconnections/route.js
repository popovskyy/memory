export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser"; // 👈 Обов'язково поверни парсер
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
		// --- ЕТАП 1: Пробуємо взяти з Redis (ШВИДКО) ---
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

		// --- ЕТАП 2: Якщо в Redis пусто — ПАРСИМО САЙТ (ПЛАН Б) ---
		// Це спрацює, якщо Крон ще не запускався або кеш протух
		if (!resultData || !resultData.data || resultData.data.length === 0) {
			console.log("⚠️ Cache MISS. Fetching live data...");

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 сек макс

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
			const table = root.querySelector("table"); // Шукаємо першу таблицю

			if (!table) throw new Error("No table found");

			const rows = table.querySelectorAll("tr");
			const data = rows.map((row) =>
				row.querySelectorAll("td, th").map((col) => col.text.trim())
			);

			resultData = { data };

			// 🔥 ЗБЕРІГАЄМО В REDIS (Щоб наступний юзер отримав миттєво) 🔥
			if (redis) {
				// Зберігаємо на 1 годину (3600 сек)
				await redis.set("schedule_full_cache", JSON.stringify(resultData), "EX", 3600);
				console.log("💾 Saved live data to Redis");
			}
		}

		// --- ЕТАП 3: Віддаємо відповідь ---
		const response = NextResponse.json(resultData);

		// Браузер/CDN кешує на 5 хв, щоб не довбати сервер занадто часто
		response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

		return response;

	} catch (err) {
		console.error("API Error:", err.message);
		return NextResponse.json({ error: "Server Error", data: [] }, { status: 500 });
	}
}
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

	// Змінні для результату
	let cachedData = null;
	let finalData = null;
	const CACHE_TTL_SECONDS = 180; // Вважаємо свіжим 3 хв

	try {
		// --- ЕТАП 1: Читаємо Redis (навіть якщо старе) ---
		if (redis) {
			try {
				const rawCache = await redis.get("schedule_full_cache_v2"); // змінив ключ, щоб скинути старе
				if (rawCache) {
					cachedData = JSON.parse(rawCache);
				}
			} catch (e) {
				console.warn("Redis read error:", e.message);
			}
		}

		const now = Date.now();
		const cacheAge = cachedData ? (now - (cachedData.timestamp || 0)) / 1000 : 999999;

		// --- ЕТАП 2: Вирішуємо, чи треба оновлювати ---
		// Оновлюємо, якщо кешу немає АБО він старіший за 3 хвилини
		if (!cachedData || cacheAge > CACHE_TTL_SECONDS) {
			console.log(`⚠️ Cache stale (age: ${cacheAge}s). Fetching live data...`);

			try {
				const controller = new AbortController();
				// Збільшив таймаут до 9 сек (Vercel hobby ліміт 10с, даємо запас 1с)
				const timeoutId = setTimeout(() => controller.abort(), 9000);

				const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
					cache: "no-store",
					headers: {
						"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
					},
					signal: controller.signal
				});
				clearTimeout(timeoutId);

				if (!resp.ok) throw new Error(`Source error: ${resp.status}`);

				const html = await resp.text();
				const root = parse(html);
				const table = root.querySelector("table");

				if (!table) throw new Error("No table found");

				const rows = table.querySelectorAll("tr");
				const data = rows.map((row) =>
					row.querySelectorAll("td, th").map((col) => {
						const ps = col.querySelectorAll("p");
						return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
					})
				).filter(r => r.length > 0);

				// Формуємо новий об'єкт
				finalData = { data, timestamp: now };

				// Зберігаємо в Redis (живе 1 годину фізично, але логічно протухає за 3 хв)
				if (redis) {
					await redis.set("schedule_full_cache_v2", JSON.stringify(finalData), "EX", 3600);
					console.log("💾 Updated Redis cache");
				}

			} catch (fetchError) {
				console.error("❌ Fetch failed:", fetchError.message);

				// --- ПЛАН Б (Рятувальний жилет) ---
				// Якщо сайт впав, але у нас є старий кеш - віддаємо його!
				if (cachedData) {
					console.log("⚠️ Serving STALE data from Redis due to fetch error");
					finalData = cachedData;
				} else {
					// Якщо немає нічого - тоді вже помилка
					throw fetchError;
				}
			}
		} else {
			// Кеш свіжий, беремо його
			finalData = cachedData;
			console.log("✅ Serving fresh data from Redis");
		}

		// --- ЕТАП 3: Відповідь ---
		const response = NextResponse.json(finalData);

		// Headers: кажемо браузеру "кешуй на 3 хв, але якщо що - юзай старе ще 1 хв"
		response.headers.set('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=60');

		return response;

	} catch (err) {
		console.error("API Fatal Error:", err.message);
		// Повертаємо пустий масив, щоб фронтенд не падав, а писав "Дані недоступні"
		return NextResponse.json({ error: "Server Error", data: [] }, { status: 500 });
	}
}
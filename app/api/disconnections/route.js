export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";
import Redis from "ioredis";

// --- ОПТИМІЗАЦІЯ 1: Глобальне підключення (Connection Pooling) ---
// Це запобігає створенню нових з'єднань на кожному кліку
let redisInstance = null;

function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 2000, // Чекаємо базу макс 2 сек
			maxRetriesPerRequest: 1,
			lazyConnect: true, // Підключаємось тільки коли треба
		});
		// Обробка помилок, щоб сервер не падав
		redisInstance.on("error", (err) => console.warn("Redis connection error:", err.message));
	}
	return redisInstance;
}

export async function GET() {
	const redis = getRedis();

	// Змінна для результату
	let resultData = null;

	try {
		// --- ЕТАП 1: Redis (Дуже швидко) ---
		if (redis) {
			try {
				// Якщо підключення ще не активне - підключаємось
				if (redis.status !== "ready" && redis.status !== "connecting") {
					await redis.connect().catch(() => {});
				}

				// Ставимо жорсткий таймаут на читання з бази (1.5 сек)
				const cachePromise = redis.get("schedule_full_cache");
				const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Redis Timeout")), 1500));

				const cached = await Promise.race([cachePromise, timeoutPromise]);

				if (cached) {
					console.log("🚀 HIT: Returning cached data");
					return NextResponse.json(JSON.parse(cached));
				}
			} catch (e) {
				console.log("⚠️ Cache Miss/Skip:", e.message);
				// Якщо база тупить - не страшно, йдемо далі
			}
		}

		// --- ЕТАП 2: Парсинг (з таймаутом 4 сек) ---
		console.log("🌍 Fetching live data...");
		const controller = new AbortController();
		const fetchTimeout = setTimeout(() => controller.abort(), 4000); // 4 сек макс

		try {
			const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
				cache: "no-store",
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" // Прикидаємось гуглом, щоб не блокували
				},
				signal: controller.signal,
			});
			clearTimeout(fetchTimeout);

			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

			const html = await resp.text();
			const root = parse(html);

			const container = root.querySelector("#fetched-data-container");
			const table = container ? container.querySelector("table") : null;

			if (!table) throw new Error("Table structure changed or blocked");

			const rows = table.querySelectorAll("tr");
			const data = rows.map((row) =>
				row.querySelectorAll("td, th").map((col) => col.text.trim())
			);

			resultData = { data };

			// --- ЕТАП 3: Збереження (Фоново) ---
			// Не чекаємо завершення запису, віддаємо відповідь юзеру відразу
			if (redis && resultData) {
				redis.set("schedule_full_cache", JSON.stringify(resultData), "EX", 1800).catch(e => console.error("Save fail:", e.message));
			}

			return NextResponse.json(resultData);

		} catch (fetchError) {
			console.error("❌ Fetch Error:", fetchError.message);
			clearTimeout(fetchTimeout);

			// Якщо парсинг не вдався, але у нас є старий кеш (навіть якщо таймаут вийшов), спробуємо дістати хоч щось?
			// На жаль, якщо ми тут, то кеш вже перевіряли.
			return NextResponse.json({ error: "Джерело даних не відповідає", details: fetchError.message }, { status: 500 });
		}

	} catch (err) {
		console.error("Critical Error:", err.message);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
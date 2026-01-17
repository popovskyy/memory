export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";
import Redis from "ioredis";

// Глобальне підключення до Redis
let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 5000, // Зменшили таймаут підключення
			lazyConnect: true,
			retryStrategy: null
		});
		redisInstance.on("error", (e) => console.warn("Redis Error:", e.message));
	}
	return redisInstance;
}

export async function GET() {
	const redis = getRedis();
	const CACHE_KEY = "schedule_full_cache_v5"; // Новий ключ v5
	const CACHE_TTL = 3600; // Зберігаємо на 1 годину (але логічно оновлюємо частіше)

	let finalData = null;
	let source = "none";

	try {
		// --- 1. СПРОБА ВЗЯТИ З КЕШУ ---
		if (redis) {
			try {
				const cached = await redis.get(CACHE_KEY);
				if (cached) {
					const parsed = JSON.parse(cached);
					// Якщо даним менше 5 хвилин - віддаємо їх і не мучимо сайт
					const age = (Date.now() - (parsed.timestamp || 0)) / 1000;
					if (age < 300) {
						console.log(`✅ Cache hit (${Math.round(age)}s old)`);
						return responseJson(parsed);
					}
					// Якщо старі - запам'ятовуємо як резерв
					finalData = parsed;
					source = "stale_cache";
				}
			} catch (e) {
				console.warn("Redis read fail:", e.message);
			}
		}

		// --- 2. СПРОБА СКАЧАТИ (FETCH) ---
		console.log("⚠️ Fetching fresh data...");

		try {
			const controller = new AbortController();
			// ⚡ ЖОРСТКИЙ ЛІМІТ 6 СЕКУНД.
			// Якщо сайт не відповів за 6с, ми кидаємо помилку, щоб Vercel не вбив нас.
			const timeoutId = setTimeout(() => controller.abort(), 6000);

			const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
				cache: "no-store",
				headers: {
					// Прикидаємось браузером
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
				},
				signal: controller.signal
			});
			clearTimeout(timeoutId);

			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

			const html = await resp.text();
			const root = parse(html);
			const table = root.querySelector("table");

			if (!table) throw new Error("Table not found");

			const rows = table.querySelectorAll("tr");
			const data = rows.map((row) =>
				row.querySelectorAll("td, th").map((col) => {
					const ps = col.querySelectorAll("p");
					return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
				})
			).filter(r => r.length > 0);

			// Успіх! Оновлюємо дані
			finalData = { data, timestamp: Date.now() };
			source = "live";

			// Зберігаємо в Redis
			if (redis) {
				// Ми не чекаємо await, щоб швидше віддати відповідь браузеру
				redis.set(CACHE_KEY, JSON.stringify(finalData), "EX", CACHE_TTL).catch(e => console.error("Redis save err:", e));
			}

		} catch (fetchErr) {
			console.error(`❌ Fetch failed: ${fetchErr.name === 'AbortError' ? 'TIMEOUT (6s)' : fetchErr.message}`);

			// Якщо скачати не вийшло, але у нас є старий кеш - це краще, ніж нічого
			if (finalData) {
				console.log("⚠️ Serving STALE data because fetch failed");
			} else {
				// Якщо немає нічого - це біда, але повертаємо пустий об'єкт, щоб не було 500 Error
				return NextResponse.json({ error: "Data unavailable (Timeout)", data: [] }, { status: 503 });
			}
		}

		// --- 3. ВІДПОВІДЬ ---
		return responseJson(finalData);

	} catch (err) {
		console.error("Fatal Error:", err.message);
		return NextResponse.json({ error: "Server Error", details: err.message }, { status: 500 });
	}
}

// Допоміжна функція для заголовків
function responseJson(data) {
	const response = NextResponse.json(data);
	response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
	return response;
}
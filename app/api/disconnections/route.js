export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";
import Redis from "ioredis";

// Глобальний клієнт, щоб не підключатися щоразу
let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 2000,
			lazyConnect: true,
			retryStrategy: null
		});
		redisInstance.on("error", (e) => console.warn("Redis err:", e.message));
	}
	return redisInstance;
}

export async function GET() {
	const redis = getRedis();

	try {
		// 1. 🚀 СУПЕР ШВИДКІСТЬ: Читаємо те, що зберіг CRON
		if (redis) {
			try {
				if (redis.status !== "ready" && redis.status !== "connecting") {
					// Фонове підключення без await, якщо ioredis вміє сам
					redis.connect().catch(() => {});
				}

				// Даємо Redis 1 секунду на відповідь
				const cachePromise = redis.get("schedule_full_cache");
				const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000));

				const cached = await Promise.race([cachePromise, timeoutPromise]);

				if (cached) {
					// 🎉 УРА! Повертаємо дані миттєво
					return NextResponse.json(JSON.parse(cached));
				}
			} catch (e) {
				console.warn("Redis skip:", e.message);
			}
		}

		// 2. 🐢 ЗАПАСНИЙ ВАРІАНТ: Якщо Cron ще не працював або Redis впав
		// Тільки тоді парсимо сайт (це буде довго, але це рідкісний випадок)
		console.log("⚠️ Cache miss. Fetching live...");

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 4000);

		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: controller.signal
		});
		clearTimeout(timeoutId);

		if (!resp.ok) throw new Error("Source error");

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("#fetched-data-container table");

		if (!table) throw new Error("No table");

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => col.text.trim())
		);

		const result = { data };

		// Зберігаємо в кеш, щоб наступному юзеру було швидко
		if (redis) {
			redis.set("schedule_full_cache", JSON.stringify(result), "EX", 3600).catch(()=>{});
		}

		return NextResponse.json(result);

	} catch (err) {
		console.error("API Error:", err.message);
		return NextResponse.json({ error: "Data unavailable" }, { status: 500 });
	}
}
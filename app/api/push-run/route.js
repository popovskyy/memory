export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";
import webpush from "web-push";
import { parse } from "node-html-parser";

// Налаштування WebPush
webpush.setVapidDetails(
	"mailto:roman@example.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

// Redis
let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			connectTimeout: 5000,
			lazyConnect: true,
			retryStrategy: null
		});
	}
	return redisInstance;
}

// --- ФУНКЦІЯ ОТРИМАННЯ ДАНИХ (Updated v5 + Fast Timeout) ---
async function getScheduleData(redis) {
	const CACHE_KEY = "schedule_full_cache_v5"; // 🔥 СИНХРОНІЗОВАНО З ВІДЖЕТОМ

	// 1. Спочатку пробуємо взяти з кешу
	try {
		const cached = await redis.get(CACHE_KEY);
		if (cached) {
			console.log("✅ Cron: Using Redis Cache (v5)");
			return JSON.parse(cached).data;
		}
	} catch (e) {
		console.warn("Redis read error:", e.message);
	}

	console.log("⚠️ Cron: Cache MISS. Fetching live data...");

	// 2. Парсинг (якщо кешу нема) з таймаутом 6 сек
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 6000); // ⚡ 6 сек ліміт

		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: 'no-store',
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
			},
			signal: controller.signal
		});
		clearTimeout(timeoutId);

		if (!resp.ok) {
			console.error(`❌ Fetch failed: ${resp.status}`);
			return null;
		}

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");

		if (!table) return null;

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0);

		console.log(`✅ Scraped ${data.length} rows. Saving to Redis v5.`);

		// Зберігаємо в той самий ключ, що і віджет!
		// Додаємо timestamp, щоб віджет знав, наскільки дані свіжі
		const cacheObj = { data, timestamp: Date.now() };
		await redis.set(CACHE_KEY, JSON.stringify(cacheObj), "EX", 3600);

		return data;
	} catch (e) {
		console.error("❌ Scrape error:", e.name === 'AbortError' ? 'TIMEOUT (6s)' : e.message);
		return null;
	}
}

export async function GET() {
	const redis = getRedis();
	if (!redis) return NextResponse.json({ error: "No Redis" }, { status: 500 });

	try {
		const data = await getScheduleData(redis);

		// Якщо даних немає - ми нічого не можемо зробити
		if (!data || data.length === 0) {
			return NextResponse.json({
				status: "No data or scrape failed",
				hint: "Possible timeout or block. Check Redis v5 key."
			});
		}

		// 🔥 ЧАС І ДАТА (Universal Fix)
		const nowKyivStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" });
		const nowKyiv = new Date(nowKyivStr);

		const d = String(nowKyiv.getDate()).padStart(2, '0');
		const m = String(nowKyiv.getMonth() + 1).padStart(2, '0');
		const y = nowKyiv.getFullYear();
		const todayStr = `${d}.${m}.${y}`;

		const todayRow = data.find((r) => r[0].trim() === todayStr);
		const QUEUE_INDEX = 9; // Черга 5.1

		if (!todayRow) {
			return NextResponse.json({ status: `No row for date ${todayStr}` });
		}

		const currentScheduleRaw = todayRow[QUEUE_INDEX] || "";
		const intervals = currentScheduleRaw.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

		let notificationTitle = "";
		let notificationBody = "";
		let eventId = "";

		// 1. ЗМІНА ГРАФІКУ
		const lastScheduleHash = await redis.get("last_schedule_state");

		if (lastScheduleHash && lastScheduleHash !== currentScheduleRaw) {
			const changeKey = `sent_change:${todayStr}:${currentScheduleRaw.length}`;
			const alreadySentChange = await redis.get(changeKey);

			if (!alreadySentChange) {
				notificationTitle = "🔄 Графік оновлено!";
				notificationBody = "Рівнеобленерго змінило години відключень.";
				eventId = changeKey;
			}
		}

		if (lastScheduleHash !== currentScheduleRaw) {
			await redis.set("last_schedule_state", currentScheduleRaw);
		}

		// 2. ЧАС (Перевірка на 35 хвилин)
		if (!notificationTitle) {
			for (const interval of intervals) {
				const [startStr, endStr] = interval.split("-").map(s => s.trim());

				const start = new Date(nowKyiv);
				const [sh, sm] = startStr.split(":").map(Number);
				start.setHours(sh, sm, 0, 0);

				const end = new Date(nowKyiv);
				const [eh, em] = endStr.split(":").map(Number);
				end.setHours(eh, em, 0, 0);

				const diffStart = (start.getTime() - nowKyiv.getTime()) / 60000;
				const diffEnd = (end.getTime() - nowKyiv.getTime()) / 60000;

				// СКОРО ВИМКНЕННЯ (35 хв)
				if (diffStart >= 0 && diffStart <= 35) {
					const key = `sent:off:${todayStr}:${startStr}`;
					const isSent = await redis.get(key);

					if (!isSent) {
						notificationTitle = `⚠️ Світло зникне через ${Math.round(diffStart)} хв`;
						notificationBody = `Готуйтесь до відключення о ${startStr}`;
						eventId = key;
						break;
					}
				}

				// СКОРО УВІМКНЕННЯ (30 хв)
				if (diffEnd >= 0 && diffEnd <= 30) {
					const key = `sent:on:${todayStr}:${endStr}`;
					const isSent = await redis.get(key);

					if (!isSent) {
						notificationTitle = `✅ Світло буде через ${Math.round(diffEnd)} хв`;
						notificationBody = `Очікуємо увімкнення о ${endStr}`;
						eventId = key;
						break;
					}
				}
			}
		}

		// --- ВІДПРАВКА ---
		if (!notificationTitle || !eventId) {
			return NextResponse.json({ status: "Checked. Nothing to send.", time: nowKyiv.toLocaleTimeString() });
		}

		const subsRaw = await redis.smembers("subs");

		if (subsRaw.length > 0) {
			const results = await Promise.allSettled(
				subsRaw.map(s => {
					const sub = JSON.parse(s);
					return webpush.sendNotification(sub, JSON.stringify({
						title: notificationTitle,
						body: notificationBody,
						icon: "/icon-192x192.png"
					})).catch(err => {
						if (err.statusCode === 410) {
							redis.srem("subs", s);
						}
					});
				})
			);
			console.log(`Sent push: "${notificationTitle}" to ${subsRaw.length} devices.`);
		}

		await redis.set(eventId, "true", "EX", 43200);

		return NextResponse.json({
			status: "Sent",
			title: notificationTitle
		});

	} catch (err) {
		console.error("Cron Error:", err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
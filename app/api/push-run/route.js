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
		redisInstance = new Redis(process.env.REDIS_URL);
	}
	return redisInstance;
}

// --- ФУНКЦІЯ ОТРИМАННЯ ДАНИХ ---
async function getScheduleData(redis) {
	// 1. Кеш (новий ключ v4, щоб скинути старе)
	const CACHE_KEY = "schedule_full_cache_v4";
	const cached = await redis.get(CACHE_KEY);

	if (cached) {
		console.log("✅ Cron: Using Redis Cache");
		return JSON.parse(cached).data;
	}

	console.log("⚠️ Cron: Cache MISS. Fetching live data...");

	// 2. Парсинг (якщо кешу нема)
	try {
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: 'no-store', // Важливо для Vercel
			headers: {
				// 🔥 МАСКУВАННЯ: Прикидаємось звичайним Chrome на Windows
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache"
			}
		});

		if (!resp.ok) {
			console.error(`❌ Fetch failed with status: ${resp.status}`);
			return null;
		}

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");

		if (!table) {
			console.error("❌ No table found in HTML");
			return null;
		}

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0);

		console.log(`✅ Scraped ${data.length} rows. Saving to Redis.`);

		// Зберігаємо на 1 годину
		await redis.set(CACHE_KEY, JSON.stringify({ data }), "EX", 3600);
		return data;
	} catch (e) {
		console.error("❌ Scrape fatal error:", e.message);
		return null;
	}
}

export async function GET() {
	const redis = getRedis();
	if (!redis) return NextResponse.json({ error: "No Redis" }, { status: 500 });

	try {
		const data = await getScheduleData(redis);

		// Якщо парсинг не вдався - повертаємо деталі для дебагу
		if (!data || data.length === 0) {
			return NextResponse.json({
				status: "No data or scrape failed",
				hint: "Check Vercel Logs for 'Scrape fatal error' or 'Fetch failed'"
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
			return NextResponse.json({ status: `No row for date ${todayStr}`, availableDataRows: data.length });
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
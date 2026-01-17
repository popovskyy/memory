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
	// 1. Спробуємо взяти з кешу Redis
	const cached = await redis.get("schedule_full_cache");
	if (cached) return JSON.parse(cached).data;

	// 2. Якщо пусто — парсимо сайт прямо тут
	try {
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			headers: { "User-Agent": "Mozilla/5.0 (Googlebot)" },
			next: { revalidate: 0 } // no-cache
		});
		if (!resp.ok) return null;

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");
		if (!table) return null;

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				// Якщо є теги <p>, склеюємо їх через пробіл
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0);

		// Оновлюємо кеш
		await redis.set("schedule_full_cache", JSON.stringify({ data }), "EX", 3600);
		return data;
	} catch (e) {
		console.error("Scrape error inside cron:", e);
		return null;
	}
}

export async function GET() {
	const redis = getRedis();
	if (!redis) return NextResponse.json({ error: "No Redis" }, { status: 500 });

	try {
		const data = await getScheduleData(redis);
		if (!data || data.length === 0) return NextResponse.json({ status: "No data or scrape failed" });

		// Часові налаштування
		const nowUTC = new Date();
		const KYIV_OFFSET = 2 * 60 * 60 * 1000;
		const nowKyiv = new Date(nowUTC.getTime() + KYIV_OFFSET);
		const todayStr = nowKyiv.toLocaleDateString("uk-UA").replace(/\./g, ".");

		// Знаходимо рядок на сьогодні
		const todayRow = data.find((r) => r[0] === todayStr);
		const QUEUE_INDEX = 9; // Черга 5.1

		if (!todayRow) return NextResponse.json({ status: "No row for today" });

		const currentScheduleRaw = todayRow[QUEUE_INDEX] || "";
		const intervals = currentScheduleRaw.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

		let notificationTitle = "";
		let notificationBody = "";
		let eventId = "";

		// 1. ПЕРЕВІРКА ЗМІНИ ГРАФІКУ
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

		// 2. ПЕРЕВІРКА ЧАСУ
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

				// "СКОРО ВИМКНЕННЯ" (0...35 хв до події)
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

				// "СКОРО УВІМКНЕННЯ" (0...30 хв до події)
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
		console.log(`Sending push to ${subsRaw.length} subs: ${notificationTitle}`);

		const results = await Promise.allSettled(
			subsRaw.map(s => {
				const sub = JSON.parse(s);
				return webpush.sendNotification(sub, JSON.stringify({
					title: notificationTitle,
					body: notificationBody,
					icon: "/icon-192x192.png"
				}));
			})
		);

		// Записуємо, що відправили (живе 12 годин)
		await redis.set(eventId, "true", "EX", 43200);

		return NextResponse.json({
			status: "Sent",
			title: notificationTitle,
			successCount: results.filter(r => r.status === 'fulfilled').length
		});

	} catch (err) {
		console.error("Cron Error:", err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
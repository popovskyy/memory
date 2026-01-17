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
	// 1. Кеш
	const cached = await redis.get("schedule_full_cache");
	if (cached) return JSON.parse(cached).data;

	// 2. Парсинг (якщо кешу нема)
	try {
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			headers: { "User-Agent": "Mozilla/5.0 (Googlebot)" },
			next: { revalidate: 0 }
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
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0);

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

		// 🔥 ВИПРАВЛЕННЯ ЧАСУ І ДАТИ (Universal Fix) 🔥
		// 1. Отримуємо точний час у Києві, незалежно від пори року
		const nowKyivStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" });
		const nowKyiv = new Date(nowKyivStr);

		// 2. Ручна збірка дати DD.MM.YYYY (щоб на Vercel точно збіглося з сайтом)
		const d = String(nowKyiv.getDate()).padStart(2, '0');
		const m = String(nowKyiv.getMonth() + 1).padStart(2, '0');
		const y = nowKyiv.getFullYear();
		const todayStr = `${d}.${m}.${y}`;

		// Знаходимо рядок
		const todayRow = data.find((r) => r[0].trim() === todayStr);
		const QUEUE_INDEX = 9; // Черга 5.1

		if (!todayRow) {
			console.log(`Cron: No row found for date ${todayStr}`);
			return NextResponse.json({ status: "No row for today", date: todayStr });
		}

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

		// 2. ПЕРЕВІРКА ЧАСУ (Тільки якщо не шлемо про зміну графіку)
		if (!notificationTitle) {
			for (const interval of intervals) {
				const [startStr, endStr] = interval.split("-").map(s => s.trim());

				// Парсимо години
				const start = new Date(nowKyiv);
				const [sh, sm] = startStr.split(":").map(Number);
				start.setHours(sh, sm, 0, 0);

				const end = new Date(nowKyiv);
				const [eh, em] = endStr.split(":").map(Number);
				end.setHours(eh, em, 0, 0);

				// Рахуємо різницю в хвилинах
				const diffStart = (start.getTime() - nowKyiv.getTime()) / 60000;
				const diffEnd = (end.getTime() - nowKyiv.getTime()) / 60000;

				// "СКОРО ВИМКНЕННЯ" (0...35 хв до події)
				// Використовуємо ключ з датою і часом, щоб не дублювати
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
							// Якщо підписка мертва - видаляємо її
							redis.srem("subs", s);
						}
					});
				})
			);
			console.log(`Sent push: "${notificationTitle}" to ${subsRaw.length} devices.`);
		}

		// Запам'ятовуємо, що відправили (на 12 годин)
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
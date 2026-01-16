export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";
import webpush from "web-push";

// Налаштування Push (VAPID)
webpush.setVapidDetails(
	"mailto:your-email@example.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL);
	}
	return redisInstance;
}

export async function GET() {
	const redis = getRedis();
	if (!redis) return NextResponse.json({ error: "No Redis" }, { status: 500 });

	try {
		// 1. Отримуємо свіжий графік (викликаємо власний API для оновлення кешу)
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://memory-zeta-ruddy.vercel.app";
		const res = await fetch(`${baseUrl}/api/disconnections`, { cache: 'no-store' });
		const { data } = await res.json();

		if (!data || data.length === 0) return NextResponse.json({ status: "No data to check" });

		// 2. Визначаємо поточний статус і час до наступної події
		const now = new Date();
		const todayStr = now.toLocaleDateString("uk-UA").replace(/\./g, ".");
		const todayRow = data.find((r) => r[0] === todayStr);

		if (!todayRow) return NextResponse.json({ status: "No schedule for today" });

		const QUEUE_INDEX = 9; // Твоя черга 5.1
		const rawIntervals = todayRow[QUEUE_INDEX];
		const intervals = rawIntervals.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

		let notificationTitle = "";
		let notificationBody = "";

		for (const interval of intervals) {
			const [startStr, endStr] = interval.split("-").map(s => s.trim());

			const start = new Date(now);
			const [sh, sm] = startStr.split(":").map(Number);
			start.setHours(sh, sm, 0, 0);

			const end = new Date(now);
			const [eh, em] = endStr.split(":").map(Number);
			end.setHours(eh, em, 0, 0);

			const diffStart = (start - now) / 60000; // хвилини до вимкнення
			const diffEnd = (end - now) / 60000;     // хвилини до увімкнення

			// Логіка: Попереджаємо за 15-20 хвилин до події
			if (diffStart > 10 && diffStart <= 25) {
				notificationTitle = "⚠️ Скоро ВИМКНЕННЯ";
				notificationBody = `Світло вимкнуть о ${startStr}. Підготуйтеся!`;
				break;
			} else if (diffEnd > 10 && diffEnd <= 25) {
				notificationTitle = "✅ Скоро УВІМКНЕННЯ";
				notificationBody = `Світло мають дати о ${endStr}. Готуйте чайник!`;
				break;
			}
		}

		// 3. Якщо є подія — розсилаємо Пуші
		if (notificationTitle) {
			const subsRaw = await redis.smembers("subs");
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
			return NextResponse.json({ status: "Notifications sent", count: results.length });
		}

		return NextResponse.json({ status: "Checked. No upcoming events." });

	} catch (err) {
		console.error("Cron Error:", err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
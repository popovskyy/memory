export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";
import webpush from "web-push";

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
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://memory-zeta-ruddy.vercel.app";
		const res = await fetch(`${baseUrl}/api/disconnections`, { cache: 'no-store' });
		const { data } = await res.json();

		if (!data || data.length === 0) return NextResponse.json({ status: "No data" });

		const nowUTC = new Date();
		const KYIV_OFFSET = 2 * 60 * 60 * 1000;
		const nowKyiv = new Date(nowUTC.getTime() + KYIV_OFFSET);
		const todayStr = nowKyiv.toLocaleDateString("uk-UA").replace(/\./g, ".");

		const todayRow = data.find((r) => r[0] === todayStr);
		const QUEUE_INDEX = 9; // Черга 5.1

		let notificationTitle = "";
		let notificationBody = "";

		// --- 1. ПЕРЕВІРКА НА ОНОВЛЕННЯ ГРАФІКУ ---
		if (todayRow) {
			const currentScheduleRaw = todayRow[QUEUE_INDEX] || "";
			const lastScheduleHash = await redis.get("last_schedule_state");

			// Якщо графік у Redis відрізняється від того, що ми щойно стягнули
			if (lastScheduleHash && lastScheduleHash !== currentScheduleRaw) {
				notificationTitle = "🔄 Графіки ОНОВЛЕНО";
				notificationBody = `Обленерго змінило розклад на сьогодні. Перевірте новий час!`;
				// Оновлюємо стан у Redis, щоб не спамити
				await redis.set("last_schedule_state", currentScheduleRaw);
			}
			else if (!lastScheduleHash) {
				// Якщо це перший запуск - просто записуємо стан
				await redis.set("last_schedule_state", currentScheduleRaw);
			}
		}

		// --- 2. ПЕРЕВІРКА НА НАБЛИЖЕННЯ ПОДІЇ (якщо ще немає титулу від оновлення) ---
		if (!notificationTitle && todayRow) {
			const intervals = todayRow[QUEUE_INDEX].match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

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

				if (diffStart > 5 && diffStart <= 25) {
					notificationTitle = "⚠️ Скоро ВИМКНЕННЯ";
					notificationBody = `Світло вимкнуть через ${Math.round(diffStart)} хв (о ${startStr}).`;
					break;
				} else if (diffEnd > 5 && diffEnd <= 25) {
					notificationTitle = "✅ Скоро УВІМКНЕННЯ";
					notificationBody = `Світло дадуть через ${Math.round(diffEnd)} хв (о ${endStr}).`;
					break;
				}
			}
		}

		// --- 3. ВІДПРАВКА ---
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
			return NextResponse.json({ status: "Sent", type: notificationTitle, count: results.length });
		}

		return NextResponse.json({ status: "Nothing to notify", timeKyiv: nowKyiv.toString() });

	} catch (err) {
		console.error("Cron Error:", err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
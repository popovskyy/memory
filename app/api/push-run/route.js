export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";
import webpush from "web-push";

// Налаштування Push (VAPID)
// Переконайся, що змінні оточення (ENV) задані у Vercel
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
		// cache: 'no-store' гарантує, що ми не беремо старий результат fetch
		const res = await fetch(`${baseUrl}/api/disconnections`, { cache: 'no-store' });
		const { data } = await res.json();

		if (!data || data.length === 0) return NextResponse.json({ status: "No data to check" });

		// 2. ВИЗНАЧАЄМО ЧАС (Fix Timezone)
		// Сервер Vercel працює в UTC. Додаємо 2 години (7200000 мс) для Києва.
		const nowUTC = new Date();
		const KYIV_OFFSET = 2 * 60 * 60 * 1000;
		const nowKyiv = new Date(nowUTC.getTime() + KYIV_OFFSET);

		const todayStr = nowKyiv.toLocaleDateString("uk-UA").replace(/\./g, ".");
		const todayRow = data.find((r) => r[0] === todayStr);

		// Якщо рядка на сьогодні немає - нічого не робимо
		if (!todayRow) {
			return NextResponse.json({
				status: "No schedule for today",
				serverTimeUTC: nowUTC.toISOString(),
				calculatedKyivTime: nowKyiv.toString()
			});
		}

		const QUEUE_INDEX = 9; // Твоя черга 5.1
		const rawIntervals = todayRow[QUEUE_INDEX];
		const intervals = rawIntervals.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

		let notificationTitle = "";
		let notificationBody = "";

		for (const interval of intervals) {
			const [startStr, endStr] = interval.split("-").map(s => s.trim());

			// Створюємо дати на основі "Київського" часу
			const start = new Date(nowKyiv);
			const [sh, sm] = startStr.split(":").map(Number);
			start.setHours(sh, sm, 0, 0);

			const end = new Date(nowKyiv);
			const [eh, em] = endStr.split(":").map(Number);
			end.setHours(eh, em, 0, 0);

			// Рахуємо різницю в хвилинах
			const diffStart = (start.getTime() - nowKyiv.getTime()) / 60000;
			const diffEnd = (end.getTime() - nowKyiv.getTime()) / 60000;

			// Логіка сповіщень:
			// Якщо до події залишилось від 5 до 25 хвилин.
			// Чому такий діапазон? Бо крон запускається раз на 10-15 хв.
			// Якщо запуститься за 19 хв до події - попадемо в умову.

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

		// 3. Якщо знайшли подію — відправляємо пуші
		if (notificationTitle) {
			const subsRaw = await redis.smembers("subs");
			const results = await Promise.allSettled(
				subsRaw.map(s => {
					const sub = JSON.parse(s);
					return webpush.sendNotification(sub, JSON.stringify({
						title: notificationTitle,
						body: notificationBody,
						icon: "/icon-192x192.png" // Переконайся, що іконка є в папці public
					}));
				})
			);
			return NextResponse.json({
				status: "Notifications sent",
				count: results.length,
				timeCheck: nowKyiv.toString()
			});
		}

		return NextResponse.json({
			status: "Checked. No upcoming events.",
			timeKyiv: nowKyiv.toString()
		});

	} catch (err) {
		console.error("Cron Error:", err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
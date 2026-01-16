export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";
import webpush from "web-push";

webpush.setVapidDetails(
	"mailto:roman@example.com",
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
		// 1. Оновлюємо кеш графіку
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://memory-zeta-ruddy.vercel.app";
		const res = await fetch(`${baseUrl}/api/disconnections`, { cache: 'no-store' });
		const { data } = await res.json();

		if (!data || data.length === 0) return NextResponse.json({ status: "No data" });

		// 2. Час (Київ)
		const nowUTC = new Date();
		const KYIV_OFFSET = 2 * 60 * 60 * 1000;
		const nowKyiv = new Date(nowUTC.getTime() + KYIV_OFFSET);
		const todayStr = nowKyiv.toLocaleDateString("uk-UA").replace(/\./g, ".");

		const todayRow = data.find((r) => r[0] === todayStr);
		const QUEUE_INDEX = 9; // Черга 5.1

		let notificationTitle = "";
		let notificationBody = "";

		if (todayRow) {
			const currentScheduleRaw = todayRow[QUEUE_INDEX] || "";
			const intervals = currentScheduleRaw.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

			// --- ЛОГІКА 1: Перевірка зміни графіку ---
			const lastScheduleHash = await redis.get("last_schedule_state");

			// Ігноруємо перший запуск, щоб не спамити відразу
			if (lastScheduleHash && lastScheduleHash !== currentScheduleRaw) {
				notificationTitle = "🔄 Графік ЗМІНИВСЯ!";
				notificationBody = "Обленерго оновило години відключень. Перевірте!";
			}
			// Завжди оновлюємо стан
			await redis.set("last_schedule_state", currentScheduleRaw);

			// --- ЛОГІКА 2: Час (тільки якщо немає сповіщення про зміну) ---
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

					// 🔥 ГОЛОВНА ЗМІНА ТУТ:
					// Ловимо від -2 хв (тільки що сталося) до 25 хв (скоро буде)

					if (diffStart >= -2 && diffStart <= 25) {
						// Щоб не спамити кожні 10 хв про одну подію, можна перевірити чи вже слали
						// Але поки залишимо просто текст
						const when = diffStart <= 0 ? "ПРЯМО ЗАРАЗ!" : `через ${Math.round(diffStart)} хв`;
						notificationTitle = "⚠️ Увага! ВИМКНЕННЯ";
						notificationBody = `Світло зникає ${when} (о ${startStr})`;
						break;
					}
					else if (diffEnd >= -2 && diffEnd <= 25) {
						const when = diffEnd <= 0 ? "ВЖЕ Є!" : `через ${Math.round(diffEnd)} хв`;
						notificationTitle = "✅ Світло ПОВЕРТАЄТЬСЯ";
						notificationBody = `Електроенергія буде ${when} (о ${endStr})`;
						break;
					}
				}
			}
		}

		// 3. Відправка
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
			return NextResponse.json({ status: "Sent", title: notificationTitle, count: results.length });
		}

		return NextResponse.json({
			status: "Checked. No logic match.",
			timeKyiv: nowKyiv.toLocaleTimeString()
		});

	} catch (err) {
		console.error("Cron Error:", err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
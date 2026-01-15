export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import webpush from "web-push";
import Redis from "ioredis";

// Налаштування WebPush
webpush.setVapidDetails(
	process.env.VAPID_SUBJECT || "mailto:test@example.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

// Підключення до Redis
const redis = new Redis(process.env.REDIS_URL);

const QUEUE_INDEX = 9; // Твоя черга 5.1

export async function GET() {
	try {
		// 1. Отримуємо підписників
		const rawSubs = await redis.smembers("subs");
		if (!rawSubs || rawSubs.length === 0) {
			return NextResponse.json({ msg: "No subscribers in DB" });
		}
		const subs = rawSubs.map((s) => (typeof s === "string" ? JSON.parse(s) : s));

		// 2. Фетчимо графік
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
		if (!siteUrl) return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL missing" });

		const res = await fetch(`${siteUrl}/api/disconnections`, { cache: "no-store" });
		const json = await res.json();
		const rows = json.data.slice(3);

		// 3. Час у Києві
		const now = new Date();
		const kyivTimeStr = now.toLocaleString("en-US", { timeZone: "Europe/Kyiv" });
		const kyivTime = new Date(kyivTimeStr);

		const todayStr = kyivTime.toLocaleDateString("uk-UA").replace(/\./g, ".");
		const todayRow = rows.find((r) => r[0] === todayStr);

		if (!todayRow) return NextResponse.json({ msg: "No schedule for today" });

		const intervals = todayRow[QUEUE_INDEX].split(",").map((v) => v.trim());
		let notifications = [];

		for (let interval of intervals) {
			if (interval.includes("Очікується")) continue;

			const [startStr, endStr] = interval.split("-").map((s) => s.trim());
			const [sh, sm] = startStr.split(":").map(Number);
			const [eh, em] = endStr.split(":").map(Number);

			const start = new Date(kyivTime); start.setHours(sh, sm, 0, 0);
			const end = new Date(kyivTime); end.setHours(eh, em, 0, 0);

			const diffStart = (start - kyivTime) / 1000 / 60;
			const diffEnd = (end - kyivTime) / 1000 / 60;

			const idStart = `sent:${todayStr}:${startStr}:off`;
			const idEnd = `sent:${todayStr}:${endStr}:on`;

			// ⚡ ЛОГІКА (0-35 хв до вимкнення)
			if (diffStart > 0 && diffStart <= 35) {
				const alreadySent = await redis.get(idStart);
				if (!alreadySent) {
					notifications.push({
						title: "⚡ Скоро вимкнуть світло",
						body: `Орієнтовно о ${startStr} (через ~${Math.round(diffStart)} хв)`,
					});
					// Запам'ятати на 4 години (EX = seconds)
					await redis.set(idStart, "1", "EX", 14400);
				}
			}

			// 💡 ЛОГІКА (0-15 хв до увімкнення)
			if (diffEnd > 0 && diffEnd <= 15) {
				const alreadySent = await redis.get(idEnd);
				if (!alreadySent) {
					notifications.push({
						title: "💡 Скоро увімкнуть світло",
						body: `Орієнтовно о ${endStr} (через ~${Math.round(diffEnd)} хв)`,
					});
					await redis.set(idEnd, "1", "EX", 14400);
				}
			}
		}

		if (notifications.length === 0) {
			return NextResponse.json({ msg: "No notifications needed right now" });
		}

		// 4. Відправка
		let sentCount = 0;
		const sendPromises = notifications.flatMap(note =>
			subs.map(async sub => {
				try {
					await webpush.sendNotification(sub, JSON.stringify(note));
					sentCount++;
				} catch (err) {
					if (err.statusCode === 410 || err.statusCode === 404) {
						console.log("🗑️ Removing dead subscription");
						await redis.srem("subs", JSON.stringify(sub));
					} else {
						console.error("Push error:", err);
					}
				}
			})
		);

		await Promise.all(sendPromises);
		return NextResponse.json({ sent: sentCount, notifications });

	} catch (e) {
		console.error("CRON Error:", e);
		return NextResponse.json({ error: e.message }, { status: 500 });
	}
}
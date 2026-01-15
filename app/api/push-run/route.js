export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Щоб Vercel не кешував результат

import { NextResponse } from "next/server";
import webpush from "web-push";
import { kv } from "@vercel/kv";

// Налаштування WebPush
webpush.setVapidDetails(
	process.env.VAPID_SUBJECT || "mailto:test@example.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

const QUEUE_INDEX = 9; // Твоя черга 5.1

export async function GET() {
	try {
		// 1. Отримуємо підписників з Redis
		const rawSubs = await kv.smembers("subs");
		if (!rawSubs || rawSubs.length === 0) {
			return NextResponse.json({ msg: "No subscribers in DB" });
		}
		// Парсимо рядки назад в об'єкти
		const subs = rawSubs.map((s) => (typeof s === "string" ? JSON.parse(s) : s));

		// 2. Фетчимо графік з твого ж сайту
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
		if (!siteUrl) return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is missing" });

		const res = await fetch(`${siteUrl}/api/disconnections`, { cache: "no-store" });
		const json = await res.json();
		const rows = json.data.slice(3);

		// 3. Визначаємо час у КИЄВІ
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

			// Створюємо об'єкти дати для початку і кінця (Київський час)
			const start = new Date(kyivTime); start.setHours(sh, sm, 0, 0);
			const end = new Date(kyivTime); end.setHours(eh, em, 0, 0);

			// Різниця в хвилинах
			const diffStart = (start - kyivTime) / 1000 / 60;
			const diffEnd = (end - kyivTime) / 1000 / 60;

			// Унікальні ключі для Redis (щоб знати, що ми вже відправили цей пуш)
			// Ключ живе 4 години (ex: 14400)
			const idStart = `sent:${todayStr}:${startStr}:off`;
			const idEnd = `sent:${todayStr}:${endStr}:on`;

			// ⚡ ЛОГІКА: Якщо до вимкнення 0-35 хв
			if (diffStart > 0 && diffStart <= 35) {
				const alreadySent = await kv.get(idStart);
				if (!alreadySent) {
					notifications.push({
						title: "⚡ Скоро вимкнуть світло",
						body: `Орієнтовно о ${startStr} (через ~${Math.round(diffStart)} хв)`,
					});
					await kv.set(idStart, "1", { ex: 14400 });
				}
			}

			// 💡 ЛОГІКА: Якщо до увімкнення 0-15 хв
			if (diffEnd > 0 && diffEnd <= 15) {
				const alreadySent = await kv.get(idEnd);
				if (!alreadySent) {
					notifications.push({
						title: "💡 Скоро увімкнуть світло",
						body: `Орієнтовно о ${endStr} (через ~${Math.round(diffEnd)} хв)`,
					});
					await kv.set(idEnd, "1", { ex: 14400 });
				}
			}
		}

		if (notifications.length === 0) {
			return NextResponse.json({ msg: "No notifications needed right now" });
		}

		// 4. Відправка (з чисткою мертвих токенів)
		let sentCount = 0;
		const sendPromises = notifications.flatMap(note =>
			subs.map(async sub => {
				try {
					await webpush.sendNotification(sub, JSON.stringify(note));
					sentCount++;
				} catch (err) {
					// Якщо підписка неактивна (410 Gone або 404 Not Found) - видаляємо з бази
					if (err.statusCode === 410 || err.statusCode === 404) {
						console.log("🗑️ Removing dead subscription");
						await kv.srem("subs", JSON.stringify(sub));
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
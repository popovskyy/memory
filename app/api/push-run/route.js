export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import webpush from "web-push";
import Redis from "ioredis";

webpush.setVapidDetails(
	process.env.VAPID_SUBJECT || "mailto:test@example.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

const redis = new Redis(process.env.REDIS_URL);
const QUEUE_INDEX = 9; // 5.1

export async function GET() {
	console.log("🚀 CRON STARTED");

	try {
		// 1. Отримуємо підписників
		const rawSubs = await redis.smembers("subs");
		if (!rawSubs || rawSubs.length === 0) return NextResponse.json({ msg: "No subscribers" });
		const subs = rawSubs.map((s) => (typeof s === "string" ? JSON.parse(s) : s));

		// 2. Фетчимо свіжі дані
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
		const res = await fetch(`${siteUrl}/api/disconnections`, { cache: "no-store" });
		const json = await res.json();

		if (!json.data) {
			console.error("❌ SCRAPER ERROR: No data");
			return NextResponse.json({ error: "Scraper failed" });
		}
		const rows = json.data.slice(3);

		// 3. Час
		const now = new Date();
		const kyivTimeStr = now.toLocaleString("en-US", { timeZone: "Europe/Kyiv" });
		const kyivTime = new Date(kyivTimeStr);
		const todayStr = kyivTime.toLocaleDateString("uk-UA").replace(/\./g, ".");

		console.log(`⏰ Current Kyiv Time: ${kyivTime.toString()}`);
		console.log(`📅 Checking date: ${todayStr}`);

		let notifications = [];

		// Знаходимо рядок на СЬОГОДНІ
		const todayRow = rows.find((r) => r[0] === todayStr);

		if (todayRow) {
			const currentScheduleRaw = todayRow[QUEUE_INDEX]; // Рядок типу "12:00-14:00"

			// ==========================================
			// 🔍 ПЕРЕВІРКА ЗМІН ГРАФІКУ (НОВА ЛОГІКА)
			// ==========================================
			const cacheKey = `schedule_snapshot:${todayStr}`;
			const lastKnownSchedule = await redis.get(cacheKey);

			// Якщо ми вже бачили графік на сьогодні, і він ВІДРІЗНЯЄТЬСЯ від того, що прийшло зараз
			if (lastKnownSchedule && lastKnownSchedule !== currentScheduleRaw) {
				console.log(`🚨 SCHEDULE CHANGED! Old: "${lastKnownSchedule}", New: "${currentScheduleRaw}"`);

				notifications.push({
					title: "📢 Графік оновився!",
					body: `Нові години для черги 5.1. Перевірте додаток.`,
				});
			}

			// Зберігаємо актуальний графік в базу (щоб порівняти наступного разу)
			// EX 86400 - зберігаємо на 24 години
			if (lastKnownSchedule !== currentScheduleRaw) {
				await redis.set(cacheKey, currentScheduleRaw, "EX", 172800);
			}
			// ==========================================
		}

		// --- Далі твоя стандартна перевірка (Вимкнуть/Увімкнуть) ---

		const checkDay = async (dateToCheck, isTomorrow = false) => {
			const dateStr = dateToCheck.toLocaleDateString("uk-UA").replace(/\./g, ".");
			const row = rows.find((r) => r[0] === dateStr);

			if (!row) return;

			const intervals = row[QUEUE_INDEX].split(",").map((v) => v.trim());

			for (let interval of intervals) {
				if (interval.includes("Очікується")) continue;

				const [startStr, endStr] = interval.split("-").map((s) => s.trim());
				const [sh, sm] = startStr.split(":").map(Number);
				const [eh, em] = endStr.split(":").map(Number);

				const start = new Date(dateToCheck); start.setHours(sh, sm, 0, 0);
				const end = new Date(dateToCheck); end.setHours(eh, em, 0, 0);

				const diffStart = (start - kyivTime) / 1000 / 60;
				const diffEnd = (end - kyivTime) / 1000 / 60;

				const idStart = `sent:${dateStr}:${startStr}:off`;
				const idEnd = `sent:${dateStr}:${endStr}:on`;

				if (diffStart > 0 && diffStart <= 35) {
					const alreadySent = await redis.get(idStart);
					if (!alreadySent) {
						console.log(`⚡ TRIGGER OFF: ${interval}`);
						notifications.push({
							title: isTomorrow ? "⚡ Завтра вночі вимкнуть світло" : "⚡ Скоро вимкнуть світло",
							body: `Орієнтовно о ${startStr} (через ~${Math.round(diffStart)} хв)`,
						});
						await redis.set(idStart, "1", "EX", 14400);
					}
				}

				if (diffEnd > 0 && diffEnd <= 15) {
					const alreadySent = await redis.get(idEnd);
					if (!alreadySent) {
						console.log(`💡 TRIGGER ON: ${interval}`);
						notifications.push({
							title: "💡 Скоро увімкнуть світло",
							body: `Орієнтовно о ${endStr} (через ~${Math.round(diffEnd)} хв)`,
						});
						await redis.set(idEnd, "1", "EX", 14400);
					}
				}
			}
		};

		// 1. Перевіряємо СЬОГОДНІ
		await checkDay(kyivTime, false);

		// 2. Якщо вечір (>23:00), перевіряємо ЗАВТРА
		if (kyivTime.getHours() >= 23) {
			const tomorrow = new Date(kyivTime);
			tomorrow.setDate(tomorrow.getDate() + 1);
			await checkDay(tomorrow, true);
		}

		if (notifications.length === 0) {
			console.log("💤 Nothing to send");
			return NextResponse.json({ msg: "No notifications" });
		}

		// Відправка
		let sentCount = 0;
		// Використовуємо for...of для послідовної відправки (надійніше)
		for (const note of notifications) {
			for (const sub of subs) {
				try {
					await webpush.sendNotification(sub, JSON.stringify(note));
					sentCount++;
				} catch (err) {
					if (err.statusCode === 410 || err.statusCode === 404) {
						await redis.srem("subs", JSON.stringify(sub));
					}
				}
			}
		}

		console.log(`✅ Sent ${sentCount}`);
		return NextResponse.json({ sent: sentCount });

	} catch (e) {
		console.error("🔥 ERROR:", e);
		return NextResponse.json({ error: e.message }, { status: 500 });
	}
}
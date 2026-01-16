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

// Створюємо інстанс Redis один раз
const redis = new Redis(process.env.REDIS_URL);
const QUEUE_INDEX = 9; // 5.1

export async function GET() {
	console.log("🚀 CRON STARTED");

	try {
		// 1. Отримуємо підписників
		const rawSubs = await redis.smembers("subs");
		const subs = rawSubs.map((s) => (typeof s === "string" ? JSON.parse(s) : s));

		// 2. Фетчимо свіжі дані (ЦЕ НАЙДОВША ОПЕРАЦІЯ)
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
		const res = await fetch(`${siteUrl}/api/disconnections`, { cache: "no-store" });
		const json = await res.json();

		if (!json.data) {
			console.error("❌ SCRAPER ERROR: No data");
			return NextResponse.json({ error: "Scraper failed" });
		}

		// 🔥🔥🔥 ГОЛОВНА ФІШКА: Зберігаємо ці дані в кеш для сайту 🔥🔥🔥
		// Тепер користувачам не треба чекати парсингу, Cron вже все зробив!
		// EX 3600 = зберігаємо на 1 годину (до наступного крону)
		await redis.set("schedule_full_cache", JSON.stringify(json), "EX", 3600);
		console.log("💾 Cache updated by CRON");

		const rows = json.data.slice(3);

		// ... (ДАЛІ ТВІЙ КОД СПОВІЩЕНЬ БЕЗ ЗМІН) ...
		// Я скоротив його тут для зручності, але ти залиш ту логіку, що ми писали раніше
		// (перевірка часу, відправка пушів і т.д.)

		// --- ТУТ МАЄ БУТИ ЛОГІКА ПУШІВ (Copy-Paste з минулого разу) ---

		return NextResponse.json({ ok: true });

	} catch (e) {
		console.error("🔥 ERROR:", e);
		return NextResponse.json({ error: e.message }, { status: 500 });
	}
}
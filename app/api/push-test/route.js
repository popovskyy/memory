export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { kv } from "@vercel/kv"; // 👇 Додаємо Redis

webpush.setVapidDetails(
	"mailto:popovskyy@gmail.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

export async function POST() {
	try {
		// 1. Беремо підписників з Redis (а не з файлу)
		const rawSubs = await kv.smembers("subs");

		if (!rawSubs || rawSubs.length === 0) {
			return NextResponse.json({ error: "No subscribers in DB" }, { status: 400 });
		}

		const subs = rawSubs.map((s) => (typeof s === "string" ? JSON.parse(s) : s));

		const payload = JSON.stringify({
			title: "Тестове сповіщення 🛠️",
			body: "Система працює! Перевірка зв'язку ✅",
		});

		let successCount = 0;

		// 2. Відправляємо всім
		await Promise.all(
			subs.map(async (sub) => {
				try {
					await webpush.sendNotification(sub, payload);
					successCount++;
				} catch (err) {
					console.error("Push fail:", err);
					// Тут теж можна додати видалення мертвих токенів, як в основному файлі
					if (err.statusCode === 410 || err.statusCode === 404) {
						await kv.srem("subs", JSON.stringify(sub));
					}
				}
			})
		);

		return NextResponse.json({ ok: true, sent: successCount });

	} catch (e) {
		return NextResponse.json({ error: e.message }, { status: 500 });
	}
}
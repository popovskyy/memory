export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSubscriptions } from "../subscribe/route";

const QUEUE_INDEX = 9; // 5.1

// Запам'ятовуємо, які пуші вже відправляли
let sentEvents = new Set();

webpush.setVapidDetails(
	"mailto:test@example.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

export async function GET() {
	const subs = getSubscriptions();
	if (!subs.length) return NextResponse.json({ msg: "No subscribers" });

	// Фетчимо графік
	const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/disconnections`);
	const json = await res.json();
	const rows = json.data.slice(3);

	const now = new Date();
	const todayStr = now.toLocaleDateString("uk-UA").replace(/\./g, ".");
	const todayRow = rows.find(r => r[0] === todayStr);

	if (!todayRow) return NextResponse.json({ msg: "No data for today" });

	const intervals = todayRow[QUEUE_INDEX]
		.split(",")
		.map(v => v.trim());

	let notifications = [];

	for (let interval of intervals) {
		if (interval.includes("Очікується")) continue;

		const [startStr, endStr] = interval.split("-").map(s => s.trim());
		const [sh, sm] = startStr.split(":").map(Number);
		const [eh, em] = endStr.split(":").map(Number);

		const start = new Date(now); start.setHours(sh, sm, 0, 0);
		const end = new Date(now); end.setHours(eh, em, 0, 0);

		const msToStart = start - now;
		const msToEnd = end - now;

		// ID для запобігання дублю пушів
		const idStart = `${todayStr}-${startStr}-start`;
		const idEnd = `${todayStr}-${endStr}-end`;

		// ⚡ Пуш перед вимкненням (30 хв)
		if (msToStart > 0 && msToStart <= 30 * 60 * 1000 && !sentEvents.has(idStart)) {
			sentEvents.add(idStart);
			notifications.push({
				title: "⚡ Скоро вимкнуть світло",
				body: `Залишилось ~30 хв (${interval})`,
			});
		}

		// 🔌 Пуш перед включенням (10 хв)
		if (msToEnd > 0 && msToEnd <= 10 * 60 * 1000 && !sentEvents.has(idEnd)) {
			sentEvents.add(idEnd);
			notifications.push({
				title: "🔌 Скоро увімкнеться світло",
				body: `Залишилось ~10 хв (${interval})`,
			});
		}
	}

	if (!notifications.length) {
		return NextResponse.json({ msg: "No triggers now" });
	}

	for (let note of notifications) {
		for (let sub of subs) {
			webpush.sendNotification(sub, JSON.stringify(note)).catch(console.error);
		}
	}

	return NextResponse.json({ sent: notifications.length });
}

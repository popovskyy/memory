export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSubscriptions } from "../subscribe/route";

webpush.setVapidDetails(
	"mailto:test@example.com",
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

export async function POST() {
	const subs = getSubscriptions();

	if (!subs.length) {
		return NextResponse.json({ error: "No subscribers" }, { status: 400 });
	}

	const payload = JSON.stringify({
		title: "Тестове сповіщення",
		body: "Все працює! 🔔",
	});

	const sendJobs = subs.map(sub =>
		webpush.sendNotification(sub, payload).catch(err => {
			console.error("Push fail:", err);
		})
	);

	await Promise.all(sendJobs);

	return NextResponse.json({ ok: true });
}

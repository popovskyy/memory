export const runtime = "nodejs";

import { NextResponse } from "next/server";

let subscriptions = [];

export async function POST(request) {
	const sub = await request.json();
	subscriptions.push(sub);

	console.log("SUBSCRIPTIONS COUNT:", subscriptions.length);

	return NextResponse.json({ ok: true });
}

// Reserved — maybe later we will store to DB
export function getSubscriptions() {
	return subscriptions;
}

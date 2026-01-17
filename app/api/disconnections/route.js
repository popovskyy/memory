export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

export async function GET() {
	try {
		console.log("🚀 Live Fetch: Direct to Oblenergo...");

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 9000);

		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache"
			},
			signal: controller.signal
		});
		clearTimeout(timeoutId);

		if (!resp.ok) throw new Error(`HTTP Error: ${resp.status}`);

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");

		if (!table) throw new Error("Table not found");

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0);

		// Додаємо жорсткі хедери проти кешування для iPhone
		return NextResponse.json({
			data,
			timestamp: Date.now(),
			status: "live"
		}, {
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0',
			}
		});

	} catch (err) {
		console.error("❌ API Error:", err.message);
		return NextResponse.json({
			error: "Source Timeout",
			details: err.message
		}, {
			status: 504,
			headers: { 'Cache-Control': 'no-store' }
		});
	}
}
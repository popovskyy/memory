export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

export async function GET() {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 9000);

		const resp = await fetch(`https://www.roe.vsei.ua/disconnections?v=${Date.now()}`, {
			cache: "no-store",
			headers: {
				"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
				"Pragma": "no-cache",
				"Cache-Control": "no-cache"
			},
			signal: controller.signal
		});
		clearTimeout(timeoutId);

		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");

		if (!table) throw new Error("Table not found");

		const rows = table.querySelectorAll("tr");
		const rawData = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0 && r[0] !== "");

		const firstDateIndex = rawData.findIndex(r => r[0] && r[0].match(/^\d{2}\.\d{2}\.\d{4}$/));
		const cleanData = firstDateIndex !== -1 ? rawData.slice(firstDateIndex) : rawData;

		return NextResponse.json({ data: cleanData }, {
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0',
			}
		});
	} catch (err) {
		return NextResponse.json({ error: err.message }, { status: 504 });
	}
}
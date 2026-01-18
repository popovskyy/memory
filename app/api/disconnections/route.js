export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

async function fetchWithRetry(url, options, retries = 2) {
	for (let i = 0; i < retries; i++) {
		try {
			const controller = new AbortController();
			// Ставимо коротший таймаут на кожну спробу (4 секунди)
			const timeoutId = setTimeout(() => controller.abort(), 4000);

			const response = await fetch(url, { ...options, signal: controller.signal });
			clearTimeout(timeoutId);

			if (response.ok) return response;
		} catch (err) {
			console.log(`⚠️ Спроба ${i + 1} провалена, пробуємо ще раз...`);
			if (i === retries - 1) throw err;
		}
	}
}

export async function GET() {
	try {
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: {
				// Імітуємо реальний браузер ще детальніше
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept-Encoding": "gzip, deflate, br",
				"Connection": "keep-alive",
				"Host": "www.roe.vsei.ua"
			}
		});

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");

		if (!table) throw new Error("Таблицю не знайдено");

		const rows = table.querySelectorAll("tr");
		const allData = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0 && r[0] !== "");

		const firstDateIdx = allData.findIndex(r => r[0] && r[0].match(/^\d{2}\.\d{2}\.\d{4}$/));
		const finalRows = firstDateIdx !== -1 ? allData.slice(firstDateIdx) : allData;

		return NextResponse.json({ data: finalRows, timestamp: Date.now() }, {
			headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
		});

	} catch (err) {
		return NextResponse.json({ error: "Обленерго не відповідає", details: err.message }, { status: 504 });
	}
}
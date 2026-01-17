export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

export async function GET() {
	try {
		console.log("🚀 Запит напряму до Обленерго...");

		const controller = new AbortController();
		// Даємо сайту 9 секунд на відповідь (ліміт Vercel)
		const timeoutId = setTimeout(() => controller.abort(), 9000);

		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			},
			signal: controller.signal
		});
		clearTimeout(timeoutId);

		if (!resp.ok) throw new Error(`Помилка сайту: ${resp.status}`);

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");

		if (!table) throw new Error("Таблицю не знайдено");

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0);

		return NextResponse.json({
			data,
			timestamp: Date.now(),
			status: "live"
		});

	} catch (err) {
		console.error("❌ Помилка завантаження:", err.message);
		return NextResponse.json({
			error: "Сайт Обленерго не відповів вчасно або заблокував запит",
			details: err.message
		}, { status: 504 });
	}
}
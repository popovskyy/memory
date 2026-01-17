export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

export async function GET() {
	const controller = new AbortController();
	// Vercel Hobby вбиває все через 10с, ставимо запас
	const timeoutId = setTimeout(() => controller.abort(), 9000);

	try {
		console.log("📡 Прямий запит без зайвих параметрів...");

		// Тільки чистий URL, без t=Date.now()
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
				"Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
				"Connection": "keep-alive"
			},
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!resp.ok) throw new Error(`HTTP Error: ${resp.status}`);

		const html = await resp.text();
		const root = parse(html);
		const table = root.querySelector("table");

		if (!table) throw new Error("Таблицю не знайдено");

		const rows = table.querySelectorAll("tr");

		// Парсимо дані без зайвої фільтрації на цьому етапі
		const allData = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => {
				const ps = col.querySelectorAll("p");
				return ps.length > 0 ? ps.map(p => p.text.trim()).join(" ") : col.text.trim();
			})
		).filter(r => r.length > 0 && r[0] !== "");

		// Знаходимо початок фактичних даних
		const firstDateIdx = allData.findIndex(r => r[0] && r[0].match(/^\d{2}\.\d{2}\.\d{4}$/));
		const finalRows = firstDateIdx !== -1 ? allData.slice(firstDateIdx) : allData;

		return NextResponse.json({
			data: finalRows,
			timestamp: Date.now()
		}, {
			headers: {
				'Cache-Control': 'no-store, max-age=0',
			}
		});

	} catch (err) {
		console.error("❌ Помилка запиту:", err.message);

		return NextResponse.json({
			error: "Сайт Обленерго не відповів",
			details: err.message
		}, {
			status: 504,
			headers: { 'Cache-Control': 'no-store' }
		});
	}
}
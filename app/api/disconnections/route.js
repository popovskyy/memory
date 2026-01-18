export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

export async function GET() {
	try {
		// 🔥 Використовуємо звичайний fetch, але додаємо заголовок мови та реферер
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "uk-UA,uk;q=0.9", // Обов'язково вказуємо українську мову
				"Origin": "https://www.roe.vsei.ua",
				"Referer": "https://www.roe.vsei.ua/"
			},
			next: { revalidate: 0 }
		});

		if (!resp.ok) throw new Error(`Status: ${resp.status}`);

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
		).filter(r => r.length > 0 && r[0] !== "");

		const firstDateIdx = data.findIndex(r => r[0] && r[0].match(/^\d{2}\.\d{2}\.\d{4}$/));
		const finalRows = firstDateIdx !== -1 ? data.slice(firstDateIdx) : data;

		return NextResponse.json({ data: finalRows });

	} catch (err) {
		console.error("Fatal Error:", err.message);
		return NextResponse.json({ error: "Обленерго не відповідає", details: err.message }, { status: 504 });
	}
}
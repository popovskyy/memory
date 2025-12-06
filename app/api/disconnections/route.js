import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

// 👇 Додаємо це
export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: { "User-Agent": "Mozilla/5.0" },
		});

		const html = await resp.text();
		const root = parse(html);

		const container = root.querySelector("#fetched-data-container");
		if (!container) {
			console.error("Container not found!");
			return NextResponse.json({ error: "Container not found" }, { status: 500 });
		}

		const table = container.querySelector("table");
		if (!table) {
			console.error("Table not found inside container!");
			return NextResponse.json({ error: "Table not found" }, { status: 500 });
		}

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => col.text.trim())
		);

		return NextResponse.json({ data });

	} catch (err) {
		console.error("Unexpected Scraper Error:", err);
		return NextResponse.json({ error: "Scraper failed" }, { status: 500 });
	}
}

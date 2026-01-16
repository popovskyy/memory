export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parse } from "node-html-parser";
import Redis from "ioredis";

// Підключаємось до твоєї бази
const redis = new Redis(process.env.REDIS_URL);

export async function GET() {
	try {
		// 1. ⚡ Спробуємо взяти з кешу Redis (це дуже швидко)
		const cachedData = await redis.get("schedule_full_cache");

		if (cachedData) {
			// Якщо є в базі - віддаємо відразу, не парсимо сайт
			return NextResponse.json(JSON.parse(cachedData));
		}

		// 2. 🐢 Якщо в базі пусто або старо - парсимо сайт
		console.log("Cache miss. Scraping site...");
		const resp = await fetch("https://www.roe.vsei.ua/disconnections", {
			cache: "no-store",
			headers: { "User-Agent": "Mozilla/5.0" },
		});

		const html = await resp.text();
		const root = parse(html);

		const container = root.querySelector("#fetched-data-container");
		if (!container) throw new Error("Container not found");

		const table = container.querySelector("table");
		if (!table) throw new Error("Table not found");

		const rows = table.querySelectorAll("tr");
		const data = rows.map((row) =>
			row.querySelectorAll("td, th").map((col) => col.text.trim())
		);

		const result = { data };

		// 3. 💾 Зберігаємо в Redis на 30 хвилин (1800 сек)
		// Тепер наступні запити будуть літати
		await redis.set("schedule_full_cache", JSON.stringify(result), "EX", 1800);

		return NextResponse.json(result);

	} catch (err) {
		console.error("Scraper Error:", err);
		return NextResponse.json({ error: "Scraper failed" }, { status: 500 });
	}
}
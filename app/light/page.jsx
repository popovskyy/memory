"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LightPage() {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const QUEUE_INDEX = 9; // 5.1
	const [isOffNow, setIsOffNow] = useState(false);
	const [nextEventText, setNextEventText] = useState("");
	const [todayIntervals, setTodayIntervals] = useState([]);

	const parseIntervals = (raw) => {
		if (!raw) return [];
		return raw.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];
	};

	const load = async () => {
		try {
			const res = await fetch("/api/disconnections");
			const json = await res.json();

			if (!json.error) {
				const tableRows = json.data.slice(3);
				setRows(tableRows);
				localStorage.setItem("light-data", JSON.stringify(tableRows));
				calcStatus(tableRows);
			} else setError(json.error);
		} catch {
			setError("Помилка запиту");
		}
		setLoading(false);
	};

	useEffect(() => {
		const cached = localStorage.getItem("light-data");
		if (cached) {
			const parsed = JSON.parse(cached);
			setRows(parsed);
			calcStatus(parsed);
			setLoading(false);
		}
		load();
	}, []);

	const calcStatus = (dataRows) => {
		const now = new Date();
		const todayStr = now.toLocaleDateString("uk-UA").replace(/\./g, ".");
		const todayRow = dataRows.find((r) => r[0] === todayStr);
		if (!todayRow) return;

		const intervals = parseIntervals(todayRow[QUEUE_INDEX]);
		setTodayIntervals(intervals);

		let offNow = false;
		let nextChangeText = "📅 Дані уточнюються";

		for (let interval of intervals) {
			const [startStr, endStr] = interval.split("-").map(s => s.trim());
			const nowD = new Date();
			const start = new Date(nowD);
			const end = new Date(nowD);
			const [sh, sm] = startStr.split(":").map(Number);
			const [eh, em] = endStr.split(":").map(Number);

			start.setHours(sh, sm, 0, 0);
			end.setHours(eh, em, 0, 0);

			if (nowD >= start && nowD <= end) {
				offNow = true;
				nextChangeText = `🔌 Світло повернеться через ${formatDiff(end - nowD)}`;
				break;
			} else if (nowD < start && !offNow) {
				nextChangeText = `⚡ Вимкнуть через ${formatDiff(start - nowD)}`;
				break;
			}
		}

		setIsOffNow(offNow);
		setNextEventText(nextChangeText);
	};

	const formatDiff = (ms) => {
		const mins = Math.floor(ms / 60000);
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${h > 0 ? h + " год " : ""}${m} хв`;
	};

	if (!rows.length && loading)
		return <p className="text-center text-gray-300 p-6">Завантаження…</p>;

	const todayDate = new Date().toLocaleDateString("uk-UA").replace(/\./g, ".");
	const todayIndex = rows.findIndex((r) => r[0] === todayDate);
	const futureRows = rows.slice(todayIndex + 1);

	return (
		<main className="min-h-screen bg-gray-900 text-white p-6 flex justify-center">
			<div className="max-w-[600px] w-full space-y-6">

				<Link href="/" className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition border border-gray-600">
					⬅ Назад
				</Link>

				<div className={`text-center text-lg font-bold p-3 rounded-lg border shadow
					${isOffNow ? "bg-red-700 border-red-500" : "bg-green-700 border-green-500"}`}>
					{isOffNow ? "🔴 Світло ВИМКНЕНО" : "🟢 Світло Є"}
				</div>

				<p className="text-center text-gray-300">{nextEventText}</p>

				<h1 className="text-xl font-bold text-center">
					💡 Відключення — Щасливе <span className="text-yellow-300">(5.1)</span>
				</h1>

				{/* 🌟 Сьогодні */}
				<h2 className="text-lg font-bold mb-2">🔥 Сьогодні</h2>
				{todayIntervals.map((interval, i) => (
					<div key={i} className="bg-gray-800 border border-gray-600 p-3 text-center rounded-md text-lg font-semibold">
						⚡ {interval}
					</div>
				))}

				{/* 📅 Майбутні дні */}
				{futureRows.length > 0 && (
					<>
						<h2 className="text-lg font-bold mt-6 mb-2">📅 Наступні дні</h2>
						<div className="space-y-3">
							{futureRows.map((row, i) => {
								const raw = row[QUEUE_INDEX];
								const intervals = parseIntervals(raw);
								const isWaiting = raw.includes("Очікується");

								return (
									<div key={i} className="bg-gray-800 border border-gray-700 p-3 rounded-lg">
										<p className="font-bold mb-2 text-center">{row[0]}</p>

										{isWaiting ? (
											<p className="text-center text-yellow-300">⏳ Очікується</p>
										) : (
											intervals.map((intv, idx) => (
												<p key={idx} className="text-center bg-gray-900 rounded-md py-2 my-1">
													⚡ {intv}
												</p>
											))
										)}
									</div>
								);
							})}
						</div>
					</>
				)}

			</div>
		</main>
	);
}

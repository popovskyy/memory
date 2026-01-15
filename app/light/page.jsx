"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PushManager from "../../components/PushManager";

// Іконки
const IconZap = ({ className }) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
		<path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
	</svg>
);

const IconClock = ({ className }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
	</svg>
);

export default function LightPage() {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const QUEUE_INDEX = 9; // Черга 5.1
	const [isOffNow, setIsOffNow] = useState(false);
	const [nextEventText, setNextEventText] = useState("");
	const [todayIntervals, setTodayIntervals] = useState([]);

	// --- ЛОГІКА ПАРСИНГУ ---
	const parseIntervals = (raw) => {
		if (!raw) return [];
		return raw.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];
	};

	// Ця функція лише оновлює дані з сервера (фоново)
	const fetchFreshData = async () => {
		try {
			const res = await fetch("/api/disconnections");
			const json = await res.json();

			if (!json.error) {
				const tableRows = json.data.slice(3);
				// Оновлюємо, тільки якщо дані реально прийшли
				setRows(tableRows);
				localStorage.setItem("light-data", JSON.stringify(tableRows));
				calcStatus(tableRows);
			} else {
				console.error(json.error);
			}
		} catch (e) {
			console.error("Background update failed", e);
		} finally {
			// Вимикаємо лоадер у будь-якому випадку (якщо він ще був увімкнений)
			setLoading(false);
		}
	};

	// Основний ефект при завантаженні
	useEffect(() => {
		// 1. Спробуємо взяти з кешу МИТТЄВО
		const cached = localStorage.getItem("light-data");

		if (cached) {
			try {
				const parsed = JSON.parse(cached);
				if (parsed && parsed.length > 0) {
					setRows(parsed);
					calcStatus(parsed);
					setLoading(false); // <--- ВІДРАЗУ показуємо контент
				}
			} catch (e) {
				console.error("Cache parse error", e);
			}
		}

		// 2. У будь-якому випадку запускаємо оновлення (тихо)
		fetchFreshData();

		// Оновлюємо статус кожну хвилину (щоб таймер цокав)
		const interval = setInterval(() => {
			if (rows.length > 0) calcStatus(rows);
		}, 60000);

		return () => clearInterval(interval);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const calcStatus = (dataRows) => {
		if (!dataRows || dataRows.length === 0) return;

		const now = new Date();
		const todayStr = now.toLocaleDateString("uk-UA").replace(/\./g, ".");
		const todayRow = dataRows.find((r) => r[0] === todayStr);

		if (!todayRow) return;

		const intervals = parseIntervals(todayRow[QUEUE_INDEX]);
		setTodayIntervals(intervals);

		let offNow = false;
		let nextChangeText = "Дані уточнюються";

		for (let interval of intervals) {
			const [startStr, endStr] = interval.split("-").map((s) => s.trim());
			const nowD = new Date();
			const start = new Date(nowD);
			const end = new Date(nowD);
			const [sh, sm] = startStr.split(":").map(Number);
			const [eh, em] = endStr.split(":").map(Number);

			start.setHours(sh, sm, 0, 0);
			end.setHours(eh, em, 0, 0);

			if (nowD >= start && nowD <= end) {
				offNow = true;
				nextChangeText = `Увімкнуть через ${formatDiff(end - nowD)}`;
				break;
			} else if (nowD < start && !offNow) {
				nextChangeText = `Вимкнуть через ${formatDiff(start - nowD)}`;
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

	// Показуємо спінер, ТІЛЬКИ якщо немає даних взагалі (ні з кешу, ні з мережі)
	if (rows.length === 0 && loading)
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
				<div className="animate-pulse flex flex-col items-center gap-2">
					<IconZap className="w-8 h-8" />
					<span>Завантаження даних...</span>
				</div>
			</div>
		);

	const todayDate = new Date().toLocaleDateString("uk-UA").replace(/\./g, ".");
	const todayIndex = rows.findIndex((r) => r[0] === todayDate);
	const futureRows = todayIndex !== -1 ? rows.slice(todayIndex + 1) : [];

	return (
		<main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500/30 pb-10">
			{/* Фон */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]" />
			</div>

			<div className="relative z-10 max-w-md mx-auto p-4 flex flex-col gap-6">

				{/* HEADER */}
				<header className="flex items-center justify-between py-2">
					<Link href="/" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
						<div className="p-2 rounded-full bg-slate-900/50 border border-slate-800 group-hover:border-slate-600 transition-all">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
						</div>
						<span className="font-medium text-sm">На головну</span>
					</Link>
					<div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
						Черга 5.1
					</div>
				</header>

				{/* HERO STATUS CARD */}
				<div className="relative">
					<div className={`absolute -inset-1 rounded-3xl blur-xl opacity-40 transition-all duration-1000 ${isOffNow ? "bg-red-600" : "bg-emerald-500"}`} />
					<div className={`relative rounded-3xl p-6 border transition-all duration-500 overflow-hidden ${isOffNow ? "bg-gradient-to-br from-red-950 to-slate-900 border-red-900/50" : "bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-900/50"}`}>
						<div className="flex flex-col items-center text-center gap-3">
							<div className={`p-4 rounded-full mb-1 shadow-lg ${isOffNow ? "bg-red-500/10 text-red-500 shadow-red-900/20" : "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20"}`}>
								<IconZap className={`w-12 h-12 ${!isOffNow && "fill-current"}`} />
							</div>

							<div>
								<h2 className="text-3xl font-black tracking-tight mb-1">
									{isOffNow ? "Світла НЕМАЄ" : "Світло Є"}
								</h2>
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/50 border border-white/5 backdrop-blur-sm">
									<IconClock className="w-4 h-4 text-slate-400" />
									<span className="text-sm font-medium text-slate-200">{nextEventText}</span>
								</div>
							</div>
						</div>
					</div>
				</div>


				{/* TODAY SCHEDULE */}
				<section>
					<div className="flex items-center gap-2 mb-4 px-2">
						<div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
						<h3 className="text-lg font-bold text-slate-200">Розклад на сьогодні</h3>
					</div>

					<div className="grid gap-3">
						{todayIntervals.length > 0 ? (
							todayIntervals.map((interval, i) => (
								<div key={i} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md shadow-sm hover:border-slate-700 transition-colors">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-lg bg-red-500/10 text-red-400"><IconZap className="w-5 h-5" /></div>
										<span className="font-semibold text-lg tracking-wide text-slate-200">{interval}</span>
									</div>
									<span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-slate-500 uppercase">Відключення</span>
								</div>
							))
						) : (
							<div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-slate-500">
								На сьогодні відключень не планується (або дані відсутні)
							</div>
						)}
					</div>
				</section>

				{/* FUTURE DAYS */}
				{futureRows.length > 0 && (
					<section className="pt-4 border-t border-slate-800/50">
						<h3 className="text-lg font-bold text-slate-200 mb-4 px-2">Наступні дні</h3>
						<div className="grid gap-4">
							{futureRows.map((row, i) => {
								const raw = row[QUEUE_INDEX];
								const intervals = parseIntervals(raw);
								const isWaiting = raw.includes("Очікується");
								const [dateDay, dateMonth] = row[0].split('.');

								return (
									<div key={i} className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-4">
										<div className="flex items-start gap-4">
											<div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-800/50 border border-slate-700">
												<span className="text-lg font-bold text-white leading-none">{dateDay}</span>
												<span className="text-[10px] uppercase font-bold text-slate-500 mt-1">{dateMonth}</span>
											</div>
											<div className="flex-1">
												{isWaiting ? (
													<div className="h-14 flex items-center text-yellow-500/80 text-sm font-medium"><span className="mr-2">⏳</span> Графік очікується</div>
												) : intervals.length > 0 ? (
													<div className="flex flex-wrap gap-2">
														{intervals.map((intv, idx) => (
															<span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-medium text-red-200">{intv}</span>
														))}
													</div>
												) : (<span className="text-slate-500 text-sm">Немає даних</span>)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</section>
				)}
			</div>

			{/* Кнопка PushManager */}
			<PushManager />

		</main>
	);
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PushManager from "../components/PushManager";
import WaterOrderButton from "../components/WaterOrderButton";

// --- ІКОНКИ ---
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

const IconHome = ({ className }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
	</svg>
);

export default function HomePage() {
	// --- СТАН ---
	const [showLight, setShowLight] = useState(false); // Керує відкриттям шторки
	const [rows, setRows] = useState([]); // Дані графіку

	// Статус для UI
	const [status, setStatus] = useState({ isOff: false, text: "Завантаження...", intervals: [] });
	const QUEUE_INDEX = 9; // Черга 5.1

	// --- ЛОГІКА РОЗРАХУНКІВ ---
	const parseIntervals = (raw) => raw?.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

	const formatDiff = (ms) => {
		const mins = Math.floor(ms / 60000);
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${h > 0 ? h + " год " : ""}${m} хв`;
	};

	const recalcStatus = (currentRows) => {
		if (!currentRows || currentRows.length === 0) return;

		const now = new Date();
		const todayStr = now.toLocaleDateString("uk-UA").replace(/\./g, ".");
		const todayRow = currentRows.find((r) => r[0] === todayStr);

		if (todayRow) {
			const raw = todayRow[QUEUE_INDEX];
			const intervals = parseIntervals(raw);

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
			setStatus({ isOff: offNow, text: nextChangeText, intervals });
		} else {
			setStatus({ isOff: false, text: "Немає даних на сьогодні", intervals: [] });
		}
	};

	// --- ЗАВАНТАЖЕННЯ ДАНИХ (Один раз при вході) ---
	useEffect(() => {
		// 1. Спочатку LocalStorage (миттєво)
		const local = localStorage.getItem("light-data");
		let loadedData = [];

		if (local) {
			try {
				loadedData = JSON.parse(local);
				setRows(loadedData);
				recalcStatus(loadedData);
			} catch(e){}
		}

		// 2. Фонове оновлення (якщо даних немає або вони старі > 5 хв)
		const lastFetch = localStorage.getItem("light-last-ts");
		const now = Date.now();

		// Якщо даних немає АБО пройшло 5 хвилин
		if (loadedData.length === 0 || (now - (parseInt(lastFetch)||0) > 300000)) {
			fetch("/api/disconnections")
				.then(r => r.json())
				.then(json => {
					if(json.data && json.data.length > 0) {
						const newRows = json.data.slice(3);
						setRows(newRows);
						localStorage.setItem("light-data", JSON.stringify(newRows));
						localStorage.setItem("light-last-ts", now.toString());
						recalcStatus(newRows);
					}
				})
				.catch(e => console.error("Fetch error:", e));
		}

		// Таймер оновлення тексту (щохвилини)
		const timer = setInterval(() => recalcStatus(rows), 60000);
		return () => clearInterval(timer);
	}, []); // Пустий масив залежностей = виконується 1 раз при старті сайту


	// --- РЕНДЕР ---
	return (
		<main className="min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">

			{/* === ГОЛОВНИЙ ЕКРАН (МЕНЮ) === */}
			{/* Ми не видаляємо його з DOM, а просто ховаємо CSS-ом, щоб не перерендерювати */}
			<div className={`transition-all duration-500 ease-in-out ${showLight ? "scale-90 opacity-0 pointer-events-none blur-sm" : "scale-100 opacity-100 blur-0"} flex items-center justify-center min-h-screen p-6`}>

				{/* Фонові ефекти */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />

				<div className="max-w-md w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-2xl space-y-6 shadow-2xl relative z-10">

					{/* Кнопка ВІДКРИТИ СВІТЛО */}
					<div className="relative group w-full cursor-pointer touch-manipulation" onClick={() => setShowLight(true)}>
						<div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-500" />
						<div className="relative flex items-center justify-center gap-3 w-full px-8 py-5 bg-gradient-to-br from-yellow-500 via-orange-500 to-yellow-600 rounded-xl text-white font-black text-2xl tracking-wider shadow-lg transform transition-all duration-200 active:scale-95 border border-yellow-400/30 overflow-hidden">
							<div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:left-[100%] transition-all duration-700" />
							<IconZap className="w-8 h-8 text-yellow-100 drop-shadow-md" />
							<span className="drop-shadow-md uppercase">Світло</span>
						</div>
					</div>

					<Link href="/memory" className="block w-full text-center px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg hover:bg-blue-600 hover:border-blue-500 transition-all">
						🧠 Memory Game
					</Link>

					<Link href="/puzzle" className="block w-full text-center px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg hover:bg-emerald-600 hover:border-emerald-500 transition-all">
						🧩 Puzzle Game
					</Link>

					<div className="relative w-full">
						<Link href="/numbers" className="block w-full text-center px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg hover:bg-purple-600 hover:border-purple-500 transition-all">
							🎨 Малювання Цифр
						</Link>
						<span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-slate-900 shadow-lg animate-bounce">NEW</span>
					</div>

					<WaterOrderButton />
					<PushManager />
				</div>
			</div>


			{/* === ШТОРКА "СВІТЛО" (POPUP) === */}
			<div
				className={`fixed inset-0 z-50 bg-slate-950 overflow-y-auto transition-transform duration-300 ease-out ${showLight ? "translate-y-0" : "translate-y-[110%]"}`}
			>
				<div className="max-w-md mx-auto min-h-screen p-4 pb-20">

					{/* Кнопка НАЗАД (Верхнє меню) */}
					<div className="flex justify-between items-center py-4 mb-2 sticky top-0 bg-slate-950/90 backdrop-blur-md z-20">
						<button
							onClick={() => setShowLight(false)}
							className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-all active:scale-95"
						>
							<IconHome className="w-5 h-5" />
							<span className="font-bold text-sm">Меню</span>
						</button>
						<div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
							Черга 5.1
						</div>
					</div>

					{/* БЛОК СТАТУСУ (Є/Немає) */}
					<div className={`relative rounded-3xl p-6 border transition-all duration-500 overflow-hidden mb-6 ${status.isOff ? "bg-gradient-to-br from-red-950 to-slate-900 border-red-900/50" : "bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-900/50"}`}>
						<div className={`absolute -inset-1 rounded-3xl blur-2xl opacity-20 ${status.isOff ? "bg-red-600" : "bg-emerald-500"}`} />
						<div className="relative flex flex-col items-center text-center gap-3">
							<div className={`p-4 rounded-full mb-1 shadow-lg ${status.isOff ? "bg-red-500/10 text-red-500 shadow-red-900/20" : "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20"}`}>
								<IconZap className={`w-12 h-12 ${!status.isOff && "fill-current"}`} />
							</div>
							<div>
								<h2 className="text-3xl font-black tracking-tight mb-1">{status.isOff ? "Світла НЕМАЄ" : "Світло Є"}</h2>
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/50 border border-white/5 backdrop-blur-sm">
									<IconClock className="w-4 h-4 text-slate-400" />
									<span className="text-sm font-medium text-slate-200">{status.text}</span>
								</div>
							</div>
						</div>
					</div>

					{/* СПИСОК НА СЬОГОДНІ */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 px-2 opacity-70">
							<div className="w-2 h-2 rounded-full bg-yellow-400" />
							<h3 className="text-sm font-bold uppercase tracking-widest">Сьогодні</h3>
						</div>
						{status.intervals.length > 0 ? (
							status.intervals.map((interval, i) => (
								<div key={i} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-lg bg-red-500/10 text-red-400"><IconZap className="w-5 h-5" /></div>
										<span className="font-semibold text-lg text-slate-200">{interval}</span>
									</div>
								</div>
							))
						) : (
							<div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
								На сьогодні немає відключень (або дані вантажаться)
							</div>
						)}
					</div>

					{/* НАСТУПНІ ДНІ */}
					{(rows.length > 0) && (
						<div className="mt-8 pt-4 border-t border-slate-800/50">
							<h3 className="text-sm font-bold uppercase tracking-widest px-2 mb-4 opacity-70">Наступні дні</h3>
							<div className="grid gap-3 opacity-80">
								{(() => {
									const todayDate = new Date().toLocaleDateString("uk-UA").replace(/\./g, ".");
									const todayIndex = rows.findIndex((r) => r[0] === todayDate);
									const futureRows = todayIndex !== -1 ? rows.slice(todayIndex + 1) : [];

									return futureRows.map((row, i) => {
										const raw = row[QUEUE_INDEX];
										const intervals = parseIntervals(raw);
										const isWaiting = raw && raw.includes("Очікується");
										const [d, m] = row[0].split('.');
										return (
											<div key={i} className="flex items-center gap-4 p-3 bg-slate-900 border border-slate-800 rounded-xl">
												<div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-800 rounded-lg font-bold">
													<span>{d}</span><span className="text-[10px] text-slate-500 uppercase">{m}</span>
												</div>
												<div className="flex-1">
													{isWaiting ? <span className="text-yellow-600 text-sm">Очікується...</span> :
														intervals.length > 0 ? <div className="text-sm text-slate-300">{intervals.join(", ")}</div> :
															<span className="text-slate-600 text-xs">--</span>}
												</div>
											</div>
										)
									})
								})()}
							</div>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
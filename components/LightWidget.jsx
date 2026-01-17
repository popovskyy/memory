"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {useLight} from "../app/context/LightContext"; // 1. Додали імпорт

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

export default function LightWidget({ onToggle }) {
	const { rows, loading } = useLight();
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false); // Для порталу

	const [status, setStatus] = useState({
		isOff: false,
		text: "Оновлення...",
		intervals: [],
		error: false
	});

	const QUEUE_INDEX = 9;

	// --- ЛОГІКА ДАТ ---
	const getTodayString = () => {
		const d = new Date();
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = d.getFullYear();
		return `${day}.${month}.${year}`;
	};

	const parseIntervals = (raw) => raw?.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g) || [];

	const formatDiff = (ms) => {
		const mins = Math.floor(ms / 60000);
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${h > 0 ? h + " год " : ""}${m} хв`;
	};

	const recalcStatus = (currentRows) => {
		if (!currentRows || currentRows.length === 0) {
			setStatus(prev => ({ ...prev, text: "Немає даних", error: true }));
			return;
		}

		const todayStr = getTodayString();
		const todayRow = currentRows.find((r) => r[0].trim() === todayStr);

		if (todayRow) {
			const raw = todayRow[QUEUE_INDEX];
			const intervals = parseIntervals(raw);
			let offNow = false;
			let nextChangeText = intervals.length > 0 ? "Світло є" : "Відключень немає";
			const nowD = new Date();

			for (let interval of intervals) {
				const [startStr, endStr] = interval.split("-").map((s) => s.trim());
				const start = new Date(nowD);
				const [sh, sm] = startStr.split(":").map(Number);
				start.setHours(sh, sm, 0, 0);

				const end = new Date(nowD);
				const [eh, em] = endStr.split(":").map(Number);
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
			setStatus({ isOff: offNow, text: nextChangeText, intervals, error: false });
		} else {
			setStatus({ isOff: false, text: "Дані застаріли", intervals: [], error: false });
		}
	};

	useEffect(() => {
		setMounted(true); // Портал можна рендерити тільки на клієнті
		if (loading) {
			setStatus(prev => ({ ...prev, text: "Завантаження..." }));
			return;
		}
		if (rows.length > 0) {
			recalcStatus(rows);
		}
		const timer = setInterval(() => {
			if (rows.length > 0) recalcStatus(rows);
		}, 60000);

		return () => clearInterval(timer);
	}, [rows, loading]);

	const handleToggle = (state) => {
		setIsOpen(state);
		if (onToggle) onToggle(state);
	};

	return (
		<>
			{/* === КНОПКА (Залишається в потоці) === */}
			<div className="relative group w-full cursor-pointer touch-manipulation" onClick={() => handleToggle(true)}>
				<div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-500" />
				<div className="relative flex items-center justify-center gap-3 w-full px-8 py-5 bg-gradient-to-br from-yellow-500 via-orange-500 to-yellow-600 rounded-xl text-white font-black text-2xl tracking-wider shadow-lg transform transition-all duration-200 active:scale-95 border border-yellow-400/30 overflow-hidden">
					<div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:left-[100%] transition-all duration-700" />
					<IconZap className="w-8 h-8 text-yellow-100 drop-shadow-md" />
					<span className="drop-shadow-md uppercase">Світло</span>
				</div>
			</div>

			{/* === ШТОРКА (Портал в body) === */}
			{/* Виносимо шторку з батьківського div-а, щоб на неї не діяв scale/blur */}
			{mounted && createPortal(
				<div
					className={`fixed inset-0 z-50 bg-slate-950 overflow-y-auto transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-[110%]"}`}
				>
					<div className="max-w-md mx-auto min-h-screen p-4 pb-20 text-white">

						<div className="flex justify-between items-center py-4 mb-2 sticky top-0 bg-slate-950/90 backdrop-blur-md z-20">
							<button
								onClick={() => handleToggle(false)}
								className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-all active:scale-95"
							>
								<IconHome className="w-5 h-5" />
								<span className="font-bold text-sm">Меню</span>
							</button>
							<div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
								Черга 5.1
							</div>
						</div>

						<div className={`relative rounded-3xl p-6 border transition-all duration-500 overflow-hidden mb-6 ${status.isOff ? "bg-gradient-to-br from-red-950 to-slate-900 border-red-900/50" : "bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-900/50"}`}>
							<div className={`absolute -inset-1 rounded-3xl blur-2xl opacity-20 ${status.isOff ? "bg-red-600" : "bg-emerald-500"}`} />
							<div className="relative flex flex-col items-center text-center gap-3">
								<div className={`p-4 rounded-full mb-1 shadow-lg ${status.isOff ? "bg-red-500/10 text-red-500 shadow-red-900/20" : "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20"}`}>
									<IconZap className={`w-12 h-12 ${!status.isOff && "fill-current"}`} />
								</div>
								<div>
									<h2 className="text-3xl font-black tracking-tight mb-1 text-white">
										{loading ? "Завантаження..." :
											status.error ? "Помилка" :
												status.isOff ? "Світла НЕМАЄ" : "Світло Є"}
									</h2>
									<div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/50 border border-white/5 backdrop-blur-sm">
										<IconClock className="w-4 h-4 text-slate-400" />
										<span className="text-sm font-medium text-slate-200">{status.text}</span>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-2 px-2 opacity-70">
								<div className="w-2 h-2 rounded-full bg-yellow-400" />
								<h3 className="text-sm font-bold uppercase tracking-widest text-white">
									Сьогодні ({getTodayString()})
								</h3>
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
									{loading ? "Оновлюємо дані..." : "На сьогодні немає відключень"}
								</div>
							)}
						</div>

						{/* Наступні дні */}
						{rows.length > 0 && (
							<div className="mt-8 pt-4 border-t border-slate-800/50">
								<h3 className="text-sm font-bold uppercase tracking-widest px-2 mb-4 opacity-70">Наступні дні</h3>
								<div className="grid gap-3 opacity-80">
									{(() => {
										const todayStr = getTodayString();
										const todayIndex = rows.findIndex((r) => r[0].trim() === todayStr);
										const futureRows = todayIndex !== -1 ? rows.slice(todayIndex + 1) : rows;

										if (futureRows.length === 0) return <div className="text-xs text-slate-500 px-2">Більше даних немає</div>;

										return futureRows.map((row, i) => {
											const raw = row[QUEUE_INDEX];
											const intervals = parseIntervals(raw);
											const isWaiting = raw && raw.toLowerCase().includes("очікується");
											const parts = row[0].split('.');
											const d = parts[0];
											const m = parts[1];

											return (
												<div key={i} className="flex items-center gap-4 p-3 bg-slate-900 border border-slate-800 rounded-xl">
													<div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-800 rounded-lg font-bold">
														<span>{d}</span><span className="text-[10px] text-slate-500 uppercase">{m}</span>
													</div>
													<div className="flex-1">
														{isWaiting ? <span className="text-yellow-600 text-sm">Очікується...</span> :
															intervals.length > 0 ? <div className="text-sm text-slate-300">{intervals.join(", ")}</div> :
																<span className="text-slate-600 text-xs">Немає відключень</span>}
													</div>
												</div>
											)
										})
									})()}
								</div>
							</div>
						)}
					</div>
				</div>,
				document.body // 2. Вказуємо, куди рендерити (в кінець body)
			)}
		</>
	);
}
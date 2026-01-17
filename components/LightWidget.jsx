"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLight } from "../app/context/LightContext";

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

const PlasmaBolt = ({ className, style }) => (
	<svg viewBox="0 0 24 50" fill="currentColor" className={`absolute pointer-events-none ${className}`} style={style}>
		<path d="M12 0 L0 30 L10 35 L5 50 L24 20 L14 15 L20 0 Z" />
	</svg>
);

export default function LightWidget({ onToggle }) {
	const { rows, loading } = useLight();
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	const [status, setStatus] = useState({
		isOff: false,
		text: "Оновлення...",
		intervals: [],
		error: false
	});

	const QUEUE_INDEX = 9;

	// Safari-friendly дата
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
				const [sh, sm] = startStr.split(":").map(Number);
				const [eh, em] = endStr.split(":").map(Number);

				const start = new Date(nowD);
				start.setHours(sh, sm, 0, 0);
				const end = new Date(nowD);
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
			setStatus({ isOff: false, text: "Дані уточнюються", intervals: [], error: false });
		}
	};

	useEffect(() => {
		setMounted(true);
		if (!loading && rows.length > 0) recalcStatus(rows);
		const timer = setInterval(() => { if (rows.length > 0) recalcStatus(rows); }, 60000);
		return () => clearInterval(timer);
	}, [rows, loading]);

	const handleToggle = (state) => {
		setIsOpen(state);
		if (onToggle) onToggle(state);
	};

	const glowColor = status.isOff ? "rgba(239, 68, 68, 0.8)" : "rgba(103, 232, 249, 0.8)";
	const boltColor = status.isOff ? "text-red-500" : "text-cyan-300";

	return (
		<>
			<style jsx global>{`
        @keyframes flash-bolt {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          10%, 90% { opacity: 0; }
          50% { opacity: 1; transform: scale(1.2) rotate(5deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jitter {
          0% { transform: translate(0,0); }
          25% { transform: translate(1px, 1px); }
          50% { transform: translate(-1px, -1px); }
          75% { transform: translate(1px, -1px); }
          100% { transform: translate(0,0); }
        }
        .animate-flash-1 { animation: flash-bolt 0.6s infinite; }
        .animate-flash-2 { animation: flash-bolt 0.8s infinite; animation-delay: 0.3s; }
        .animate-flash-3 { animation: flash-bolt 1.2s infinite; animation-delay: 0.5s; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-jitter { animation: jitter 0.3s infinite; }
      `}</style>

			<div className="relative group w-full cursor-pointer touch-manipulation" onClick={() => handleToggle(true)}>
				<div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-500" />
				<div className="relative flex items-center justify-center gap-3 w-full px-8 py-5 bg-gradient-to-br from-yellow-500 via-orange-500 to-yellow-600 rounded-xl text-white font-black text-2xl tracking-wider shadow-lg transform transition-all duration-200 active:scale-95 border border-yellow-400/30 overflow-hidden">
					<div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:left-[100%] transition-all duration-700" />
					<IconZap className="w-8 h-8 text-yellow-100 drop-shadow-md" />
					<span className="drop-shadow-md uppercase text-xl">Світло</span>
				</div>
			</div>

			{mounted && createPortal(
				<div className={`fixed inset-0 z-50 bg-slate-950 overflow-y-auto transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-[110%]"}`}>
					<div className="max-w-md mx-auto min-h-screen p-4 pb-20 text-white">

						<div className="flex justify-between items-center py-4 mb-2 sticky top-0 bg-slate-950/90 backdrop-blur-md z-20">
							<button onClick={() => handleToggle(false)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-all active:scale-95">
								<IconHome className="w-5 h-5" />
								<span className="font-bold text-sm">Меню</span>
							</button>
							<div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
								Черга 5.1
							</div>
						</div>

						<div className={`relative rounded-3xl p-6 border transition-all duration-500 overflow-hidden mb-6 ${status.isOff ? "bg-gradient-to-br from-red-950 to-slate-900 border-red-900/50" : "bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-900/50"}`}>
							{!loading && (
								<>
									<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[50px] opacity-40 animate-pulse" style={{ backgroundColor: glowColor }}></div>
									<PlasmaBolt className={`top-2 -left-4 w-10 h-20 ${boltColor} animate-flash-1`} />
									<PlasmaBolt className={`bottom-2 -right-4 w-12 h-28 ${boltColor} animate-flash-2 rotate-180`} />
									<PlasmaBolt className={`-top-8 right-8 w-6 h-16 ${boltColor} animate-flash-3 rotate-45`} />
									<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 border-2 border-dashed rounded-full opacity-20 animate-spin-slow" style={{ borderColor: status.isOff ? 'red' : 'cyan' }}></div>
								</>
							)}

							<div className="relative flex flex-col items-center text-center gap-3 z-10">
								<div className={`relative p-4 rounded-full shadow-2xl transition-all duration-500 border border-white/10 ${status.isOff ? "bg-red-500/20 shadow-red-500/40" : "bg-cyan-500/20 shadow-cyan-500/40"}`}>
									{!loading && (
										<div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-30"></div>
									)}
									<IconZap className={`w-12 h-12 ${status.isOff ? "text-red-400" : "text-cyan-300"} ${!loading && "animate-jitter"}`} />
								</div>
								<div>
									<h2 className={`text-3xl font-black tracking-tight mb-2 drop-shadow-xl ${status.isOff ? "text-red-100" : "text-cyan-100"}`}>
										{loading ? "Завантаження..." : status.isOff ? "Світла НЕМАЄ" : "Світло Є"}
									</h2>
									<div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/60 border border-white/10 backdrop-blur-md shadow-lg">
										<IconClock className="w-4 h-4 text-slate-400" />
										<span className="text-xs font-bold text-slate-200 tracking-wide">{status.text}</span>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-2 px-2 opacity-70">
								<div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
								<h3 className="text-sm font-bold uppercase tracking-widest text-white">Сьогодні ({getTodayString()})</h3>
							</div>
							{status.intervals.length > 0 ? (
								status.intervals.map((interval, i) => (
									<div key={i} className="group flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-600 transition-colors">
										<div className="flex items-center gap-3">
											<div className="p-2 rounded-lg bg-white/5 text-white/70 group-hover:text-yellow-400 transition-colors"><IconZap className="w-5 h-5" /></div>
											<span className="font-semibold text-lg text-slate-200 tracking-wide">{interval}</span>
										</div>
									</div>
								))
							) : (
								<div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
									{loading ? "Оновлюємо дані..." : "Відключень не заплановано"}
								</div>
							)}
						</div>

						{rows.length > 1 && (
							<div className="mt-10 pt-6 border-t border-slate-800/80">
								<div className="flex items-center justify-between px-2 mb-5">
									<h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Прогноз на тиждень</h3>
									<div className="h-px flex-1 ml-4 bg-gradient-to-r from-slate-800 to-transparent" />
								</div>
								<div className="grid gap-4">
									{(() => {
										const todayStr = getTodayString();
										const todayIndex = rows.findIndex((r) => r[0].trim() === todayStr);
										const futureRows = todayIndex !== -1 ? rows.slice(todayIndex + 1) : rows.slice(1);

										return futureRows.map((row, i) => {
											const raw = row[QUEUE_INDEX];
											const intervals = parseIntervals(raw);
											const isWaiting = raw && raw.toLowerCase().includes("очікується");
											const [d, m] = row[0].split('.');
											return (
												<div key={i} className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900/40 to-slate-900/20 border border-slate-800/50">
													<div className="flex flex-col items-center justify-center min-w-[56px] h-[56px] bg-slate-800/80 rounded-xl border border-white/5">
														<span className="text-xl font-black text-white">{d}</span>
														<span className="text-[10px] font-bold text-indigo-400 uppercase mt-1">{m}</span>
													</div>
													<div className="flex-1">
														<div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ГПВ</div>
														{isWaiting ? (
															<div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /><span className="text-sm font-bold text-yellow-600/90 italic">Очікується...</span></div>
														) : intervals.length > 0 ? (
															<div className="flex flex-wrap gap-1.5">{intervals.map((idx, interval) => <span key={idx} className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">{interval}</span>)}</div>
														) : (
															<div className="text-sm font-bold text-emerald-500/80 flex items-center gap-1.5">Без обмежень</div>
														)}
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
				document.body
			)}
		</>
	);
}
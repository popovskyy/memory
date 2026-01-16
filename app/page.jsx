"use client";

import Link from "next/link";

export default function HomePage() {
	return (
		<main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">

			{/* Фоновий ефект (пляма світла) */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />

			<div className="relative z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white p-8 rounded-2xl space-y-6 shadow-2xl">

				{/* 🔥 МЕГА КНОПКА СВІТЛА 🔥 */}
				<div className="relative group w-full">
					{/* 1. Заднє світіння (Blur) */}
					<div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-500 group-hover:duration-200" />

					{/* 2. Сама кнопка */}
					<Link
						href="/light"
						className="relative flex items-center justify-center gap-3 w-full px-8 py-5 bg-gradient-to-br from-yellow-500 via-orange-500 to-yellow-600 rounded-xl text-white font-black text-2xl tracking-wider shadow-lg transform transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1 group-hover:shadow-yellow-500/50 border border-yellow-400/30 overflow-hidden"
					>
						{/* Блік (світлова смуга) */}
						<div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out" />

						{/* Іконка Блискавки */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-yellow-100 drop-shadow-md group-hover:animate-pulse">
							<path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
						</svg>

						<span className="drop-shadow-md uppercase">Світло</span>
					</Link>
				</div>
				{/* 🔥 КІНЕЦЬ МЕГА КНОПКИ 🔥 */}


				<Link
					href="/memory"
					className="group block w-full text-center px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg hover:bg-blue-600 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/50 transition-all duration-300"
				>
					<span className="group-hover:scale-110 inline-block transition-transform duration-200">🧠</span> Memory Game
				</Link>

				<Link
					href="/puzzle"
					className="group block w-full text-center px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg hover:bg-emerald-600 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-900/50 transition-all duration-300"
				>
					<span className="group-hover:scale-110 inline-block transition-transform duration-200">🧩</span> Puzzle Game
				</Link>


				{/* Кнопка з бейджем */}
				<div className="relative w-full group">
					<Link
						href="/numbers"
						className="block w-full text-center px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg hover:bg-purple-600 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-900/50 transition-all duration-300"
					>
						<span className="group-hover:scale-110 inline-block transition-transform duration-200">🎨</span> Малювання Цифр
					</Link>

					<span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-slate-900 shadow-lg animate-bounce z-20">
            NEW
          </span>
				</div>

			</div>
		</main>
	);
}
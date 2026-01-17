"use client";

import { useState } from "react";
import Link from "next/link";
import PushManager from "../components/PushManager";
// import WaterOrderButton from "../components/WaterOrderButton"; // Якщо треба, розкоментуй
import LightWidget from "../components/LightWidget";

export default function HomePage() {
	const [isMenuHidden, setIsMenuHidden] = useState(false);

	return (
		// Додаємо глибокий темний градієнт на фон самої сторінки
		<main className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0f172a] to-[#1e1b4b] text-white relative overflow-hidden font-sans select-none">

			{/* === ЖИВИЙ ФОН (Aurora Effect) === */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{/* Фіолетова сфера */}
				<div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-purple-600/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-blob"></div>
				{/* Синя сфера (із затримкою) */}
				<div className="absolute top-0 -right-4 w-[600px] h-[600px] bg-indigo-600/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-blob animation-delay-2000"></div>
				{/* Рожева сфера внизу (із довгою затримкою) */}
				<div className="absolute -bottom-32 left-[20%] w-[600px] h-[600px] bg-pink-600/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob animation-delay-4000"></div>
			</div>


			{/* Контейнер меню */}
			<div
				className={`
          flex items-center justify-center min-h-screen p-6 transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
          ${isMenuHidden ? "opacity-0 blur-lg pointer-events-none scale-90 translate-y-10" : "opacity-100 blur-0 scale-100 translate-y-0"}
        `}
			>
				{/* Головна картка з покращеним ефектом скла */}
				<div className="max-w-md w-full bg-slate-900/50 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl space-y-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] relative z-10 transition-all hover:shadow-[0_30px_70px_-15px_rgba(50,50,93,0.3)] hover:border-white/20">

					{/* Заголовок з градієнтом */}
					<h1 className="text-center text-3xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-sm pb-2">
						Головне Меню
					</h1>

					{/* ВІДЖЕТ СВІТЛА (Він вже сам по собі гарний) */}
					<LightWidget onToggle={(isOpen) => setIsMenuHidden(isOpen)} />

					{/* Розділювач */}
					<div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-4"></div>

					{/* Кнопки ігор (додано ефекти при наведенні) */}
					<div className="space-y-4">
						<Link href="/memory" className="group relative block w-full">
							<div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
							<div className="relative block w-full text-center px-6 py-4 bg-slate-800/80 border border-white/5 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-[1.02] hover:bg-blue-900/50 hover:border-blue-500/50 active:scale-95">
								🧠 Memory Game
							</div>
						</Link>

						<Link href="/puzzle" className="group relative block w-full">
							<div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
							<div className="relative block w-full text-center px-6 py-4 bg-slate-800/80 border border-white/5 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-900/50 hover:border-emerald-500/50 active:scale-95">
								🧩 Puzzle Game
							</div>
						</Link>

						<div className="relative w-full group">
							<Link href="/numbers" className="group relative block w-full">
								<div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
								<div className="relative block w-full text-center px-6 py-4 bg-slate-800/80 border border-white/5 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-[1.02] hover:bg-purple-900/50 hover:border-purple-500/50 active:scale-95">
									🎨 Малювання Цифр
								</div>
							</Link>
							{/* Бейдж NEW теж анімуємо */}
							<span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] font-black px-3 py-1 rounded-full border-2 border-slate-900 shadow-lg animate-pulse z-20">NEW</span>
						</div>


						<Link href="/shadows" className="group relative block w-full">
							<div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
							<div className="relative block w-full text-center px-6 py-4 bg-slate-800/80 border border-white/5 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-[1.02] hover:bg-orange-900/50 hover:border-orange-500/50 active:scale-95">
								🕵️‍♀️ Вгадай Тінь
							</div>
						</Link>
					</div>

					{/* <WaterOrderButton /> */}

					<div className="pt-2 opacity-80 hover:opacity-100 transition-opacity">
						<PushManager />
					</div>
				</div>
			</div>
		</main>
	);
}
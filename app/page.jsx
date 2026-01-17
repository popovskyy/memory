"use client";

import { useState } from "react";
import Link from "next/link";
import PushManager from "../components/PushManager";
import WaterOrderButton from "../components/WaterOrderButton";
import LightWidget from "../components/LightWidget"; // Імпорт нашого нового віджета

export default function HomePage() {
	// Цей стейт контролює видимість меню.
	// Він змінюється зсередини LightWidget через пропс onToggle
	const [isMenuHidden, setIsMenuHidden] = useState(false);

	return (
		<main className="min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">

			{/* Контейнер меню.
         Якщо isMenuHidden === true, ми додаємо прозорість, блюр і забороняємо кліки,
         але НЕ прибираємо з DOM, щоб не було стрибків.
      */}
			<div
				className={`
          flex items-center justify-center min-h-screen p-6 transition-all duration-500 ease-in-out
          ${isMenuHidden ? "opacity-0 blur-md pointer-events-none scale-95" : "opacity-100 blur-0 scale-100"}
        `}
			>
				{/* Фонові ефекти */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />

				<div className="max-w-md w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl space-y-6 shadow-2xl relative z-10">

					{/* ⚡ ВІДЖЕТ СВІТЛА
            Ми передаємо функцію setIsMenuHidden, щоб віджет міг "вимкнути" меню, коли відкривається шторка
          */}
					<LightWidget onToggle={(isOpen) => setIsMenuHidden(isOpen)} />

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
		</main>
	);
}
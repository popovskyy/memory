"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Набір даних для гри (Емодзі)
const GAME_ITEMS = [
	{ id: 1, emoji: "🦁", name: "Лев", color: "bg-yellow-500" },
	{ id: 2, emoji: "🐘", name: "Слон", color: "bg-gray-400" },
	{ id: 3, emoji: "🦊", name: "Лисичка", color: "bg-orange-500" },
	{ id: 4, emoji: "🐸", name: "Жабка", color: "bg-green-500" },
	{ id: 5, emoji: "🦄", name: "Єдиноріг", color: "bg-purple-400" },
	{ id: 6, emoji: "🦖", name: "Динозавр", color: "bg-green-700" },
	{ id: 7, emoji: "🐙", name: "Восьминіг", color: "bg-red-400" },
	{ id: 8, emoji: "🦋", name: "Метелик", color: "bg-blue-400" },
	{ id: 9, emoji: "🚀", name: "Ракета", color: "bg-indigo-500" },
	{ id: 10, emoji: "🚗", name: "Машинка", color: "bg-red-500" },
	{ id: 11, emoji: "🍕", name: "Піца", color: "bg-yellow-400" },
	{ id: 12, emoji: "🍦", name: "Морозиво", color: "bg-pink-300" },
	{ id: 13, emoji: "🌵", name: "Кактус", color: "bg-green-600" },
	{ id: 14, emoji: "🎈", name: "Кулька", color: "bg-red-400" },
	{ id: 15, emoji: "🎁", name: "Подарунок", color: "bg-blue-500" },
];

export default function ShadowGamePage() {
	const [target, setTarget] = useState(null); // Правильна відповідь (тінь)
	const [options, setOptions] = useState([]); // Варіанти вибору
	const [score, setScore] = useState(0); // Рахунок
	const [isCorrect, setIsCorrect] = useState(null); // Стан анімації (true/false/null)
	const [shake, setShake] = useState(false); // Анімація тряски при помилці

	// Функція запуску нового раунду
	const startNewRound = () => {
		// 1. Вибираємо випадковий предмет, який буде тінню
		const randomTarget = GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)];

		// 2. Вибираємо 2 неправильних варіанти (щоб не співпадали з правильним)
		let distractors = [];
		while (distractors.length < 2) {
			const randomItem = GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)];
			if (randomItem.id !== randomTarget.id && !distractors.includes(randomItem)) {
				distractors.push(randomItem);
			}
		}

		// 3. Змішуємо правильний варіант і неправильні
		const allOptions = [randomTarget, ...distractors].sort(() => Math.random() - 0.5);

		setTarget(randomTarget);
		setOptions(allOptions);
		setIsCorrect(null);
	};

	// Старт при завантаженні
	useEffect(() => {
		startNewRound();
	}, []);

	const handleChoice = (item) => {
		if (isCorrect !== null) return; // Блокуємо кліки під час анімації

		if (item.id === target.id) {
			// ✅ ПРАВИЛЬНО
			setIsCorrect(true);
			setScore(s => s + 1);
			// Чекаємо трохи і запускаємо новий раунд
			setTimeout(() => {
				startNewRound();
			}, 1000);
		} else {
			// ❌ НЕПРАВИЛЬНО
			setShake(true);
			setTimeout(() => setShake(false), 500); // Скидаємо анімацію тряски
		}
	};

	if (!target) return null;

	return (
		<main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white relative overflow-hidden font-sans select-none flex flex-col items-center justify-center p-4">

			{/* === ЖИВИЙ ФОН === */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-10 left-10 w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] animate-blob"></div>
				<div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/30 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
			</div>

			{/* Кнопка НАЗАД */}
			<Link href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 transition-all active:scale-95">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
					<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
				</svg>
				<span className="font-bold text-sm">Меню</span>
			</Link>

			{/* Рахунок */}
			<div className="absolute top-6 right-6 z-20 px-5 py-2 bg-yellow-400/20 backdrop-blur-md rounded-full border border-yellow-400/30">
				<span className="text-2xl font-black text-yellow-300">⭐ {score}</span>
			</div>

			{/* === ІГРОВА ЗОНА === */}
			<div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">

				<div className="text-center">
					<h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200 drop-shadow-sm mb-2">
						Чия це тінь?
					</h1>
					<p className="text-slate-400 text-sm">Знайди картинку, яка підходить до тіні</p>
				</div>

				{/* 🌑 КАРТКА З ТІННЮ (ЗАГАДКА) */}
				<div className="relative group">
					{/* Сяйво позаду */}
					<div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>

					<div className={`
            relative w-48 h-48 flex items-center justify-center bg-slate-800/50 backdrop-blur-xl border-2 border-white/10 rounded-3xl shadow-2xl transition-all duration-500
            ${isCorrect === true ? "scale-110 border-green-400/50 bg-green-500/10" : ""}
            ${shake ? "animate-shake border-red-400/50" : ""}
          `}>
						{/* Трюк CSS: brightness-0 робить емодзі повністю чорним (тінню) */}
						<div className={`text-[8rem] transition-all duration-700 filter ${isCorrect === true ? "brightness-100 scale-110 rotate-[360deg]" : "brightness-0 grayscale opacity-80"}`}>
							{target.emoji}
						</div>

						{/* Галочка успіху */}
						{isCorrect === true && (
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="text-6xl animate-bounce">✨</div>
							</div>
						)}
					</div>
				</div>

				{/* 👇 ВАРІАНТИ ВІДПОВІДІ */}
				<div className="grid grid-cols-3 gap-4 w-full">
					{options.map((item) => (
						<button
							key={item.id}
							onClick={() => handleChoice(item)}
							disabled={isCorrect !== null}
							className={`
                group relative flex flex-col items-center justify-center p-4 h-28 rounded-2xl border-2 transition-all duration-200 active:scale-90
                ${isCorrect !== null ? "cursor-default opacity-50" : "cursor-pointer hover:-translate-y-1 hover:shadow-lg bg-slate-800/60 border-white/5 hover:border-white/20"}
              `}
						>
							{/* Кольорова підкладка при наведенні */}
							<div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition duration-300 ${item.color}`}></div>

							<span className="text-5xl drop-shadow-md z-10 group-hover:scale-110 transition-transform">{item.emoji}</span>
						</button>
					))}
				</div>

			</div>

			{/* Стилі для анімації помилки (shake) */}
			<style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>

		</main>
	);
}
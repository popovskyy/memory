"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {

	useEffect(() => {
		// preload data silently
		fetch("/api/disconnections")
			.then(r => r.json())
			.then(json => {
				if (json.data) {
					const tableRows = json.data.slice(3);
					localStorage.setItem("light-data", JSON.stringify(tableRows));
				}
			})
			.catch(() => {});
	}, []);

	return (
		<main className="min-h-screen flex items-center justify-center p-6 bg-gray-900">
			<div className="max-w-md w-full bg-gray-800 text-white p-8 rounded-xl space-y-6 shadow-xl">

				<Link
					href="/light"
					className="block w-full text-center px-6 py-4 bg-yellow-500 rounded-lg font-bold text-lg hover:bg-yellow-600 transition"
				>
					💡 Світло
				</Link>


				<Link
					href="/memory"
					className="block w-full text-center px-6 py-4 bg-blue-600 rounded-lg font-bold text-lg hover:bg-blue-700 transition"
				>
					🧠 Memory Game
				</Link>

				<Link
					href="/puzzle"
					className="block w-full text-center px-6 py-4 bg-green-600 rounded-lg font-bold text-lg hover:bg-green-700 transition"
				>
					🧩 Puzzle Game
				</Link>


				{/* Кнопка з бейджем */}
				<div className="relative w-full">
					<Link
						href="/numbers"
						className="block w-full text-center px-6 py-4 bg-purple-600 rounded-lg font-bold text-lg hover:bg-purple-700 transition shadow-lg border-b-4 border-purple-800 active:border-b-0 active:translate-y-1"
					>
						🎨 Малювання Цифр
					</Link>

					{/* Абсолютно позиціонований бейдж */}
					<span className="absolute -top-3 -right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-gray-800 shadow-md animate-bounce">
         🔥 Новинка
       </span>
				</div>

			</div>
		</main>
	);
}
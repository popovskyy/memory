"use client";

import Link from "next/link";

export default function HomePage() {
	return (
		<main className="min-h-screen flex items-center justify-center p-6 bg-gray-900">
			<div className="max-w-md w-full bg-gray-800 text-white p-8 rounded-xl space-y-6 shadow-xl">

				<h1 className="text-3xl font-bold text-center mb-6">
					🎮 Обери гру
				</h1>

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
			</div>
		</main>
	);
}

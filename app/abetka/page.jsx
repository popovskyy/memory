"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const AlphabetGame = dynamic(
	() => import("../../components/abetka/AlphabetGame"),
	{ ssr: false }
);

export default function AbetkaPage() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-fuchsia-950 text-white">
			<div className="max-w-4xl mx-auto p-3 md:p-4 space-y-3">
				<div className="flex items-center justify-between">
					<Link
						href="/"
						className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-colors"
					>
						⬅ Меню
					</Link>
					<div className="text-center">
						<h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-violet-200 to-pink-200 bg-clip-text text-transparent">
							📚 Абетка Діани
						</h1>
						<p className="text-white/60 text-sm">3D остров букв</p>
					</div>
					<div className="w-20" />
				</div>

				<AlphabetGame />
			</div>
		</main>
	);
}

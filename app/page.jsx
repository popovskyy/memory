"use client";

import Link from "next/link";

export default function HomePage() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-fuchsia-950 text-white relative overflow-hidden font-sans select-none flex items-center justify-center p-6">

			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-violet-600/40 rounded-full blur-[120px] opacity-70 animate-blob" />
				<div className="absolute top-0 -right-4 w-[600px] h-[600px] bg-fuchsia-600/40 rounded-full blur-[120px] opacity-70 animate-blob animation-delay-2000" />
				<div className="absolute -bottom-32 left-[20%] w-[600px] h-[600px] bg-pink-600/40 rounded-full blur-[120px] opacity-60 animate-blob animation-delay-4000" />
			</div>

			<div className="max-w-md w-full bg-slate-900/50 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 text-center space-y-6">
				<div className="text-6xl">📚✨</div>
				<h1 className="text-3xl font-black bg-gradient-to-r from-violet-200 to-pink-200 bg-clip-text text-transparent">
					Абетка Діани
				</h1>
				<p className="text-white/70 text-lg">
					3D-острів букв — бігай, шукай і вчи абетку!
				</p>

				<Link href="/abetka" className="group relative block w-full">
					<div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-2xl blur opacity-50 group-hover:opacity-90 transition duration-200" />
					<div className="relative block w-full text-center px-8 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl font-black text-xl transition-all duration-200 group-hover:scale-[1.02] active:scale-95 shadow-lg">
						🚀 Почати гру!
					</div>
				</Link>
			</div>
		</main>
	);
}

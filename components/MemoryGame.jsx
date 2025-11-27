'use client';

import { useState, useEffect, useRef } from "react";

// ==========================================================================================
// IMAGES
// ==========================================================================================
const pawsImages = [
	"/images/paws/builder.jpg",
	"/images/paws/chase.jpg",
	"/images/paws/everest.jpg",
	"/images/paws/marshal.jpg",
	"/images/paws/rocky.jpg",
	"/images/paws/sky.jpg",
	"/images/paws/taksa.jpg",
	"/images/paws/zooma.jpg",
	"/images/paws/elsa.jpg",
];

// ==========================================================================================
// PLAYERS + COLORS + SOUNDS
// ==========================================================================================
const playersData = [
	{
		id: 1,
		name: "Артем",
		img: "/images/players/popovskyi_a.jpg",
		winSound: "/sounds/artem.mp3",
		color: "#22c55e",
	},
	{
		id: 2,
		name: "Діана",
		img: "/images/players/popovska_d.jpg",
		winSound: "/sounds/diana.mp3",
		color: "#ec4899",
	},
	{
		id: 3,
		name: "Наталія",
		img: "/images/players/popovska_n.jpg",
		winSound: "/sounds/natalia.mp3",
		color: "#a855f7",
	},
	{
		id: 4,
		name: "Роман",
		img: "/images/players/popovskyi_r.jpg",
		winSound: "/sounds/roman.mp3",
		color: "#3b82f6",
	},
];

function shuffle(arr) {
	return [...arr].sort(() => Math.random() - 0.5);
}

export default function MemoryGame() {
	const [cards, setCards] = useState([]);
	const [opened, setOpened] = useState([]);
	const [matched, setMatched] = useState([]);

	const [selectedPlayers, setSelectedPlayers] = useState([]);
	const [players, setPlayers] = useState([]);
	const [currentPlayer, setCurrentPlayer] = useState(0);
	const [winner, setWinner] = useState(null);

	const [gameStarted, setGameStarted] = useState(false);
	const [initialPreview, setInitialPreview] = useState(true);

	const audioRef = useRef(null);
	const canvasRef = useRef(null);
	let fireworksInterval = useRef(null);

	// SELECT PLAYERS
	const togglePlayer = (id) => {
		setSelectedPlayers((prev) =>
			prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
		);
	};

	// ==========================================================================================
	// START GAME
	// ==========================================================================================
	const startGame = () => {
		if (selectedPlayers.length === 0) return;

		// STOP old winner music
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}

		const chosen = playersData
			.filter((p) => selectedPlayers.includes(p.id))
			.map((p) => ({ ...p, moves: 0, score: 0 }));

		setPlayers(chosen);

		const deck = shuffle([...pawsImages, ...pawsImages]).map((src, i) => ({
			id: i,
			src,
		}));

		setCards(deck);
		setOpened([]);
		setMatched([]);
		setWinner(null);
		setCurrentPlayer(0);
		setGameStarted(true);
		setInitialPreview(true);

		setTimeout(() => setInitialPreview(false), 1000);
	};

	// ==========================================================================================
	// CLICK CARD
	// ==========================================================================================
	const clickCard = (i) => {
		if (!gameStarted || initialPreview) return;
		if (opened.includes(i) || matched.includes(i)) return;
		if (opened.length === 2 || winner) return;

		const next = [...opened, i];
		setOpened(next);

		if (next.length === 2) {
			const [a, b] = next;

			setPlayers((prev) =>
				prev.map((pl, index) =>
					index === currentPlayer ? { ...pl, moves: pl.moves + 1 } : pl
				)
			);

			if (cards[a].src === cards[b].src) {
				setTimeout(() => {
					setMatched((prev) => [...prev, a, b]);

					setPlayers((prev) =>
						prev.map((pl, index) =>
							index === currentPlayer ? { ...pl, score: pl.score + 1 } : pl
						)
					);

					setOpened([]);
				}, 400);
			} else {
				setTimeout(() => {
					setOpened([]);
					setCurrentPlayer((p) => (p + 1) % players.length);
				}, 800);
			}
		}
	};

	// ==========================================================================================
	// DETECT WINNER
	// ==========================================================================================
	useEffect(() => {
		if (gameStarted && cards.length > 0 && matched.length === cards.length) {
			const best = [...players].sort((a, b) => b.score - a.score)[0];
			setWinner(best);
		}
	}, [matched]);

	// ==========================================================================================
	// WINNER EFFECTS — FIREWORKS + LOOPING MUSIC
	// ==========================================================================================
	useEffect(() => {
		if (!winner) return;

		// ---- AUDIO ----
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}

		const audio = new Audio(winner.winSound);
		audio.loop = true;
		audioRef.current = audio;
		audio.play().catch(() => {});

		// ---- FIREWORKS ----
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const particles = [];

		function burst() {
			const color = winner.color;
			const x = Math.random() * canvas.width;
			const y = canvas.height * 0.3;

			for (let i = 0; i < 60; i++) {
				particles.push({
					x,
					y,
					radius: Math.random() * 4 + 2,
					color,
					alpha: 1,
					velocity: {
						x: (Math.random() - 0.5) * 8,
						y: (Math.random() - 0.5) * 8,
					},
					gravity: 0.08,
					decay: 0.015 + Math.random() * 0.01,
				});
			}
		}

		function animate() {
			ctx.fillStyle = "rgba(0,0,0,0.15)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			particles.forEach((p) => {
				p.velocity.y += p.gravity;
				p.x += p.velocity.x;
				p.y += p.velocity.y;
				p.alpha -= p.decay;
			});

			for (let p of particles) {
				if (p.alpha <= 0) continue;

				ctx.save();
				ctx.globalAlpha = p.alpha;
				ctx.fillStyle = p.color;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			requestAnimationFrame(animate);
		}

		burst();
		fireworksInterval.current = setInterval(burst, 600);
		animate();

		return () => clearInterval(fireworksInterval.current);
	}, [winner]);

	// ==========================================================================================
	// RESET
	// ==========================================================================================
	const resetFull = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}

		if (fireworksInterval.current) {
			clearInterval(fireworksInterval.current);
		}

		setSelectedPlayers([]);
		setGameStarted(false);
		setPlayers([]);
		setWinner(null);
		setInitialPreview(true);
	};

	// ==========================================================================================
	// CSS Flip
	// ==========================================================================================
	const cardBase =
		"relative aspect-square cursor-pointer [transform-style:preserve-3d] transition-transform duration-500";
	const flipped = "[transform:rotateY(180deg)]";
	const face =
		"absolute inset-0 w-full h-full backface-hidden rounded overflow-hidden";

	// ==========================================================================================
	// RENDER
	// ==========================================================================================
	return (
		<div className="space-y-4 relative">

			{/* CANVAS */}
			<canvas
				ref={canvasRef}
				className="pointer-events-none fixed inset-0 z-40"
			/>

			{/* WINNER PHOTO ANIMATION */}
			{winner && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
					<img
						src={winner.img}
						className="
							w-40 h-40 rounded-full border-4 shadow-xl
							animate-[dance_1.2s_ease-in-out_infinite]
						"
						style={{ borderColor: winner.color }}
					/>
				</div>
			)}

			<style>{`
				@keyframes dance {
					0% { transform: scale(1) rotate(0deg); }
					25% { transform: scale(1.15) rotate(6deg); }
					50% { transform: scale(1.05) rotate(-6deg); }
					75% { transform: scale(1.2) rotate(4deg); }
					100% { transform: scale(1) rotate(0deg); }
				}
			`}</style>

			{/* SELECT SCREEN */}
			{!gameStarted && (
				<div className="p-4 bg-gray-800 rounded text-white space-y-3">
					<div className="font-bold text-lg">Вибери гравців:</div>

					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{playersData.map((p) => (
							<label
								key={p.id}
								className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
									selectedPlayers.includes(p.id)
										? "bg-blue-700"
										: "bg-gray-700"
								}`}
							>
								<input
									type="checkbox"
									checked={selectedPlayers.includes(p.id)}
									onChange={() => togglePlayer(p.id)}
								/>
								<img src={p.img} className="w-20 h-20 rounded" />
								<div>{p.name}</div>
							</label>
						))}
					</div>

					<button
						onClick={startGame}
						disabled={selectedPlayers.length === 0}
						className="px-4 py-2 bg-green-600 w-full rounded mt-3 disabled:bg-gray-600"
					>
						Почати гру
					</button>
				</div>
			)}

			{/* ACTIVE GAME */}
			{gameStarted && (
				<>
					<button
						onClick={resetFull}
						className="px-4 py-2 bg-blue-300 w-full mx-auto text-white rounded mt-3 disabled:bg-gray-600"
					>
						Нова Гра
					</button>
					<div
						className="flex items-center gap-3 p-3 rounded shadow text-white"
						style={{ backgroundColor: players[currentPlayer].color }}
					>
						<img
							src={players[currentPlayer].img}
							className="w-12 h-12 rounded object-cover border-2"
							style={{ borderColor: players[currentPlayer].color }}
						/>

						<div>
							<div className="text-lg font-bold">
								Хід гравця: {players[currentPlayer].name}
							</div>
							<div className="text-sm opacity-90">
								Ходи: {players[currentPlayer].moves} | Пари: {players[currentPlayer].score}
							</div>
						</div>
					</div>

					{/* GRID */}
					<div className="grid grid-cols-4 gap-3 lg:grid-cols-4">
						{cards.map((card, i) => {
							const show =
								initialPreview || opened.includes(i) || matched.includes(i);

							return (
								<div
									key={i}
									onClick={() => clickCard(i)}
									className={`${cardBase} ${show ? flipped : ""}`}
								>
									<div className={`${face} [transform:rotateY(180deg)]`}>
										<img src={card.src} className="w-full h-full object-cover" />
									</div>
									<div className={`${face} bg-gray-500`} />
								</div>
							);
						})}
					</div>

					{/* WINNER TEXT */}
					{winner && (
						<div
							className="mt-4 p-4 text-white rounded text-center font-bold text-lg shadow-lg relative z-[70]"
							style={{ backgroundColor: winner.color }}
						>
							🏆 Переміг: {winner.name}!
							<div className="opacity-90">Пари: {winner.score}</div>
						</div>
					)}

					{/* 🔄 START NEW GAME BUTTON – FIXED AND ALWAYS VISIBLE */}
					{winner && (
						<div className="fixed inset-0 z-[80] flex justify-center items-end pb-24 pointer-events-none">
							<button
								onClick={()=> location.reload()}
								className="px-6 py-3 rounded text-white font-bold shadow-lg animate-pulse pointer-events-auto"
								style={{ backgroundColor: winner.color }}
							>
								🔄 Почати нову гру
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

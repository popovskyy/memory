"use client";

import { useState, useEffect, useRef } from "react";
import PuzzleBoard from "./PuzzleBoard";

const puzzleImages = [
	"/images/puzzles/puzzle-01.jpg",
	"/images/puzzles/puzzle-02.jpg",
	"/images/puzzles/puzzle-03.jpg",
	"/images/puzzles/puzzle-04.jpg",
	"/images/puzzles/puzzle-05.jpg",
	"/images/puzzles/puzzle-06.jpg",
	"/images/puzzles/puzzle-07.jpg",
	"/images/puzzles/puzzle-08.jpg",
	"/images/puzzles/puzzle-09.jpg",
	"/images/puzzles/puzzle-10.jpg",
	"/images/puzzles/puzzle-11.jpg",
	"/images/puzzles/puzzle-12.jpg",
];

const winSounds = [
	"/sounds/artem.mp3",
	"/sounds/diana.mp3",
	"/sounds/natalia.mp3",
	"/sounds/roman.mp3",
];

export default function PuzzleGame() {
	const [image, setImage] = useState(null);
	const [size] = useState(3);
	const [shuffled, setShuffled] = useState([]);
	const [completed, setCompleted] = useState(false);

	const audioRef = useRef(null);
	const canvasRef = useRef(null);
	const fireworksInterval = useRef(null);

	const startGame = () => {
		stopEffects();

		const randomImg =
			puzzleImages[Math.floor(Math.random() * puzzleImages.length)];
		setImage(randomImg);

		const total = size * size;
		const arr = [...Array(total)].map((_, i) => i);

		const shuffledArr = arr
			.map((v) => ({ v, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map((o) => o.v);

		setShuffled(shuffledArr);
		setCompleted(false);
	};

	const stopEffects = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		if (fireworksInterval.current) {
			clearInterval(fireworksInterval.current);
		}
	};

	useEffect(() => {
		startGame();
	}, []);

	// CHECK PUZZLE COMPLETE
	useEffect(() => {
		if (shuffled.length > 0 && shuffled.every((v, i) => v === i)) {
			setCompleted(true);
		}
	}, [shuffled]);

	// RUN EFFECTS WHEN PUZZLE COMPLETED
	useEffect(() => {
		if (!completed) return;

		// ===== AUDIO =====
		const sound = winSounds[Math.floor(Math.random() * winSounds.length)];
		const audio = new Audio(sound);
		audio.loop = true;
		audioRef.current = audio;
		audio.play().catch(() => {});

		// ===== FIREWORKS =====
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const particles = [];

		function burst() {
			const color = "#ffdd55";
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

		return () => stopEffects();
	}, [completed]);

	return (
		<div className="relative space-y-4">

			{/* CANVAS FOR FIREWORKS */}
			<canvas
				ref={canvasRef}
				className="pointer-events-none fixed inset-0 z-40"
			/>

			{/* CENTER IMAGE ANIMATION */}
			{completed && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
					<img
						src={image}
						className="
              w-100 h-100 rounded-xl border-4 shadow-xl object-cover
              animate-[dance_1.2s_ease-in-out_infinite]
            "
						style={{ borderColor: "#ffdd55" }}
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

			{/* PUZZLE */}
			<PuzzleBoard
				image={image}
				size={size}
				shuffled={shuffled}
				setShuffled={setShuffled}
			/>

			{/* COMPLETED TEXT */}
			{completed && (
				<div className="mt-4 p-4 bg-green-600 text-white rounded text-center font-bold text-lg relative z-[70]">
					🎉 Пазл зібрано!
				</div>
			)}

			{/* FIXED BUTTON */}
			{completed && (
				<div className="fixed inset-0 z-[80] flex justify-center items-end pb-24 pointer-events-none">
					<button
						onClick={()=> location.reload()}
						className="px-6 py-3 rounded text-white font-bold shadow-lg animate-pulse pointer-events-auto bg-green-600"
					>
						🔄 Нова гра
					</button>
				</div>
			)}

			{/* NORMAL BUTTON */}
			{!completed && (
				<button
					onClick={()=> location.reload()}
					className="px-4 py-2 bg-blue-600 text-white rounded w-full"
				>
					🔄 Нова гра
				</button>
			)}
		</div>
	);
}

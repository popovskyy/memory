"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import {
	generateCollectibles,
	generatePetSpawns,
	getAnimalById,
} from "./gameData";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

function celebrate() {
	confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
	setTimeout(() => {
		confetti({ particleCount: 100, angle: 60, spread: 70, origin: { x: 0 } });
		confetti({ particleCount: 100, angle: 120, spread: 70, origin: { x: 1 } });
	}, 250);
}

function TouchJoystick({ onMove }) {
	const active = useRef(false);
	const origin = useRef({ x: 0, y: 0 });

	const getTouch = (e) => {
		const t = e.touches[0];
		const dx = t.clientX - origin.current.x;
		const dy = t.clientY - origin.current.y;
		const max = 45;
		onMove(
			Math.max(-1, Math.min(1, dx / max)),
			Math.max(-1, Math.min(1, dy / max))
		);
	};

	return (
		<div
			className="absolute bottom-8 left-6 w-32 h-32 rounded-full bg-white/15 border-2 border-white/30 backdrop-blur-sm touch-none z-20"
			onTouchStart={(e) => {
				active.current = true;
				const rect = e.currentTarget.getBoundingClientRect();
				origin.current = {
					x: rect.left + rect.width / 2,
					y: rect.top + rect.height / 2,
				};
				getTouch(e);
			}}
			onTouchMove={(e) => {
				if (active.current) getTouch(e);
			}}
			onTouchEnd={() => {
				active.current = false;
				onMove(0, 0);
			}}
		>
			<div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-bold">
				🕹️
			</div>
		</div>
	);
}

export default function AdventureGame() {
	const [score, setScore] = useState(0);
	const [collectibles, setCollectibles] = useState(() => generateCollectibles(30));
	const [pets, setPets] = useState(() => generatePetSpawns());
	const [befriendedIds, setBefriendedIds] = useState([]);
	const [nearPetId, setNearPetId] = useState(null);
	const [victory, setVictory] = useState(false);
	const [showHint, setShowHint] = useState(true);

	const inputRef = useRef({ x: 0, z: 0, jump: false });
	const targetRef = useRef(null);
	const playerPosRef = useRef({ x: 0, z: 0 });

	const remaining = collectibles.filter((c) => !c.collected).length;
	const totalPets = pets.length;

	useEffect(() => {
		const timer = setTimeout(() => setShowHint(false), 6000);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		const keys = {};

		const onKeyDown = (e) => {
			keys[e.code] = true;
			if (e.code === "Space") {
				e.preventDefault();
				inputRef.current.jump = true;
			}
			let x = 0, z = 0;
			if (keys.ArrowLeft || keys.KeyA) x -= 1;
			if (keys.ArrowRight || keys.KeyD) x += 1;
			if (keys.ArrowUp || keys.KeyW) z -= 1;
			if (keys.ArrowDown || keys.KeyS) z += 1;
			const len = Math.sqrt(x * x + z * z);
			if (len > 0) {
				inputRef.current.x = x / len;
				inputRef.current.z = z / len;
				targetRef.current = null;
			}
		};

		const onKeyUp = (e) => {
			keys[e.code] = false;
			let x = 0, z = 0;
			if (keys.ArrowLeft || keys.KeyA) x -= 1;
			if (keys.ArrowRight || keys.KeyD) x += 1;
			if (keys.ArrowUp || keys.KeyW) z -= 1;
			if (keys.ArrowDown || keys.KeyS) z += 1;
			const len = Math.sqrt(x * x + z * z);
			inputRef.current.x = len > 0 ? x / len : 0;
			inputRef.current.z = len > 0 ? z / len : 0;
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	const handleCollect = useCallback((id) => {
		setCollectibles((prev) => {
			const next = prev.map((c) =>
				c.id === id ? { ...c, collected: true } : c
			);
			const left = next.filter((c) => !c.collected).length;
			if (left === 0) {
				setVictory(true);
				celebrate();
			}
			return next;
		});
		setScore((s) => s + 1);
	}, []);

	const handlePetNear = useCallback((id) => {
		if (id === null) {
			setNearPetId(null);
			return;
		}
		if (!befriendedIds.includes(id)) {
			setNearPetId(id);
		}
	}, [befriendedIds]);

	const handleBefriend = useCallback(() => {
		if (!nearPetId || befriendedIds.includes(nearPetId)) return;
		setBefriendedIds((prev) => [...prev, nearPetId]);
		setScore((s) => s + 10);
		setNearPetId(null);
		celebrate();
	}, [nearPetId, befriendedIds]);

	const handleJoystick = useCallback((x, z) => {
		inputRef.current.x = x;
		inputRef.current.z = z;
		if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) {
			targetRef.current = null;
		}
	}, []);

	const handleGroundClick = useCallback((x, z) => {
		targetRef.current = { x, z };
		inputRef.current.x = 0;
		inputRef.current.z = 0;
	}, []);

	const handleJump = useCallback(() => {
		inputRef.current.jump = true;
	}, []);

	const handleRestart = useCallback(() => {
		setScore(0);
		setCollectibles(generateCollectibles(30));
		setPets(generatePetSpawns());
		setBefriendedIds([]);
		setNearPetId(null);
		setVictory(false);
		playerPosRef.current = { x: 0, z: 0 };
	}, []);

	const nearAnimal = nearPetId ? getAnimalById(nearPetId) : null;

	return (
		<div className="relative w-full h-[75vh] min-h-[480px] rounded-2xl overflow-hidden border-4 border-pink-400/30 shadow-2xl shadow-pink-500/20">
			<GameCanvas
				inputRef={inputRef}
				targetRef={targetRef}
				playerPosRef={playerPosRef}
				collectibles={collectibles}
				pets={pets}
				befriendedIds={befriendedIds}
				onCollect={handleCollect}
				onPetNear={handlePetNear}
				onGroundClick={handleGroundClick}
				showVictory={victory}
			/>

			{/* HUD */}
			<div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10 pointer-events-none">
				<div className="bg-black/40 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20">
					<div className="text-2xl font-black text-yellow-300">⭐ {score}</div>
					<div className="text-xs text-white/70">
						Зірки: {30 - remaining}/30 · Друзі: {befriendedIds.length}/{totalPets}
					</div>
				</div>
			</div>

			{showHint && !victory && (
				<div className="absolute top-16 left-3 right-3 z-10 pointer-events-none animate-pulse">
					<div className="bg-black/50 backdrop-blur-md rounded-xl px-4 py-2 text-center text-white text-sm font-bold border border-white/20">
						🕹️ Крути джойстик або тапай на землю · Збирай зірки · Погладь зверяток!
					</div>
				</div>
			)}

			{/* Джойстик */}
			<TouchJoystick onMove={handleJoystick} />

			{/* Кнопка стрибка */}
			<button
				onClick={handleJump}
				className="absolute bottom-8 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 border-2 border-white/30 text-white text-2xl font-black shadow-lg active:scale-90 transition-transform z-20"
			>
				⬆️
			</button>

			{/* Погладити зверятко */}
			{nearAnimal && !befriendedIds.includes(nearAnimal.id) && (
				<button
					onClick={handleBefriend}
					className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-lg font-black shadow-xl border-2 border-white/30 animate-bounce active:scale-95 transition-transform"
				>
					❤️ Погладити {nearAnimal.name} {nearAnimal.emoji}
				</button>
			)}

			{/* Победа */}
			{victory && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className="text-center space-y-4 p-8 rounded-3xl bg-gradient-to-br from-pink-600/90 to-purple-700/90 border-2 border-white/30 max-w-sm mx-4">
						<div className="text-5xl">🎉🏆🎉</div>
						<h2 className="text-3xl font-black text-white">
							Ура, Діано!
						</h2>
						<p className="text-white/90 text-lg">
							Ти зібрала всі зірки! {befriendedIds.length} пухнастих друзів з тобою!
						</p>
						<p className="text-yellow-300 text-2xl font-black">⭐ {score} очок</p>
						<button
							onClick={handleRestart}
							className="px-8 py-4 rounded-2xl bg-white text-purple-700 text-xl font-black shadow-lg active:scale-95 transition-transform"
						>
							🔄 Ще раз!
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

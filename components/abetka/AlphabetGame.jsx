"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import AlphabetCanvas from "./AlphabetCanvas";
import {
	ALPHABET,
	generateLetterRound,
	pickMissionType,
	buildPrompt,
	buildSuccessMessage,
	buildWrongMessage,
} from "./alphabetData";
import { speakUk, stopSpeech, isSpeechSupported } from "./speakUk";

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
			onTouchMove={(e) => active.current && getTouch(e)}
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

export default function AlphabetGame() {
	const [started, setStarted] = useState(false);
	const [voiceOn, setVoiceOn] = useState(true);
	const [letterIndex, setLetterIndex] = useState(0);
	const [letterBlocks, setLetterBlocks] = useState([]);
	const [missionType, setMissionType] = useState("find");
	const [successFlash, setSuccessFlash] = useState(false);
	const [wrongFlash, setWrongFlash] = useState(false);
	const [victory, setVictory] = useState(false);
	const [learned, setLearned] = useState(0);

	const inputRef = useRef({ x: 0, z: 0, jump: false });
	const targetRef = useRef(null);
	const playerPosRef = useRef({ x: 0, z: 0 });
	const voiceOnRef = useRef(true);

	const current = ALPHABET[letterIndex];
	const progress = Math.round((learned / ALPHABET.length) * 100);
	const speechAvailable = isSpeechSupported();

	const say = useCallback((text) => {
		if (voiceOnRef.current && text) speakUk(text);
	}, []);

	const startRound = useCallback((index) => {
		const letter = ALPHABET[index];
		const type = pickMissionType(index);
		setMissionType(type);
		setLetterBlocks(generateLetterRound(letter));
		setSuccessFlash(false);
		setWrongFlash(false);

		const { text } = buildPrompt(letter, type);
		setTimeout(() => say(text), 400);
	}, [say]);

	useEffect(() => {
		voiceOnRef.current = voiceOn;
		if (!voiceOn) stopSpeech();
	}, [voiceOn]);

	useEffect(() => {
		if (!started) return;
		startRound(letterIndex);
	}, [letterIndex, startRound, started]);

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

	const handleLetterSelect = useCallback(
		(char) => {
			if (victory) return;

			if (char === current.char) {
				setSuccessFlash(true);
				setLearned((l) => l + 1);
				celebrate();
				say(buildSuccessMessage(current));

				setTimeout(() => {
					if (letterIndex >= ALPHABET.length - 1) {
						setVictory(true);
						celebrate();
						say("Ура, Діано! Ти знаєш всю абетку! Молодець!");
					} else {
						setLetterIndex((i) => i + 1);
					}
				}, 1800);
			} else {
				setWrongFlash(true);
				say(buildWrongMessage(current));
				setTimeout(() => setWrongFlash(false), 600);
			}
		},
		[current, letterIndex, victory, say]
	);

	const handleJoystick = useCallback((x, z) => {
		inputRef.current.x = x;
		inputRef.current.z = z;
		if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) targetRef.current = null;
	}, []);

	const handleGroundClick = useCallback((x, z) => {
		targetRef.current = { x, z };
		inputRef.current.x = 0;
		inputRef.current.z = 0;
	}, []);

	const handleJump = () => {
		inputRef.current.jump = true;
	};

	const handleRestart = () => {
		setLetterIndex(0);
		setLearned(0);
		setVictory(false);
		playerPosRef.current = { x: 0, z: 0 };
		startRound(0);
	};

	const handleStart = async () => {
		await speakUk("Привіт, Діано! Поїхали вчити абетку!");
		setStarted(true);
	};

	const prompt = buildPrompt(current, missionType);

	const handleRepeatVoice = () => {
		if (successFlash) {
			say(buildSuccessMessage(current));
		} else {
			say(prompt.text);
		}
	};

	if (!started) {
		return (
			<div className="relative w-full h-[75vh] min-h-[480px] rounded-2xl overflow-hidden border-4 border-violet-400/30 shadow-2xl shadow-violet-500/20 bg-gradient-to-br from-violet-900/80 to-fuchsia-900/80 flex items-center justify-center">
				<div className="text-center space-y-6 p-8 max-w-sm mx-4">
					<div className="text-6xl">📚✨</div>
					<h2 className="text-3xl font-black text-white">Привіт, Діано!</h2>
					<p className="text-white/80 text-lg">
						Бігай по острову, шукай букви і слухай завдання вслух!
					</p>
					{speechAvailable && (
						<p className="text-violet-200 text-sm">
							🔊 Озвучка українською (натисни «Почати» — почуєш голос)
						</p>
					)}
					<button
						onClick={handleStart}
						className="px-10 py-5 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-2xl font-black shadow-xl active:scale-95 transition-transform"
					>
						🚀 Почати!
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="relative w-full h-[75vh] min-h-[480px] rounded-2xl overflow-hidden border-4 border-violet-400/30 shadow-2xl shadow-violet-500/20">
			<AlphabetCanvas
				inputRef={inputRef}
				targetRef={targetRef}
				playerPosRef={playerPosRef}
				letterBlocks={letterBlocks}
				targetChar={current.char}
				onLetterSelect={handleLetterSelect}
				onGroundClick={handleGroundClick}
				showVictory={victory || successFlash}
			/>

			{/* HUD */}
			<div className="absolute top-3 left-3 right-3 z-10 space-y-2">
				<div className="flex justify-between items-start gap-2">
					<div className="bg-black/40 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20 pointer-events-none">
						<div className="text-xs text-white/70">Абетка</div>
						<div className="text-lg font-black text-violet-200">
							{letterIndex + 1} / {ALPHABET.length}
						</div>
					</div>
					<div className="flex items-start gap-2">
						{speechAvailable && (
							<button
								onClick={() => setVoiceOn((v) => !v)}
								className={`w-11 h-11 rounded-2xl border-2 border-white/30 text-lg backdrop-blur-md active:scale-95 transition-all ${
									voiceOn ? "bg-violet-600/80" : "bg-black/50 opacity-60"
								}`}
								title={voiceOn ? "Вимкнути озвучку" : "Увімкнути озвучку"}
							>
								{voiceOn ? "🔊" : "🔇"}
							</button>
						)}
						<div className="bg-black/40 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20 text-right pointer-events-none">
							<div className="text-xs text-white/70">Вивчено</div>
							<div className="text-lg font-black text-yellow-300">{learned} ✨</div>
						</div>
					</div>
				</div>

				<div className="bg-black/30 backdrop-blur-md rounded-full h-3 border border-white/10 overflow-hidden pointer-events-none">
					<div
						className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			{/* Завдання */}
			<div
				className={`absolute top-20 left-3 right-3 z-10 pointer-events-none transition-all duration-300 ${
					wrongFlash ? "animate-pulse" : ""
				}`}
			>
				<div
					className={`rounded-2xl px-4 py-3 border-2 text-center backdrop-blur-md ${
						successFlash
							? "bg-green-500/40 border-green-400"
							: wrongFlash
								? "bg-red-500/40 border-red-400"
								: "bg-black/50 border-white/20"
					}`}
				>
					<p className="text-xl md:text-2xl font-black text-white drop-shadow-lg">
						{successFlash
							? `${buildSuccessMessage(current)} ${current.emoji}`
							: prompt.text}
					</p>
					{!successFlash && (
						<p className="text-white/80 text-sm mt-1">{prompt.sub}</p>
					)}
				</div>
			</div>

			{/* Алфавіт-шпаргалка */}
			<div className="absolute bottom-24 left-3 right-3 z-10 pointer-events-none">
				<div className="flex flex-wrap justify-center gap-1 opacity-80">
					{ALPHABET.map((a, i) => (
						<span
							key={a.char}
							className={`text-xs font-bold px-1.5 py-0.5 rounded ${
								i < letterIndex
									? "bg-green-500/60 text-white"
									: i === letterIndex
										? "bg-violet-500 text-white scale-110"
										: "bg-white/10 text-white/40"
							}`}
						>
							{a.char}
						</span>
					))}
				</div>
			</div>

			<TouchJoystick onMove={handleJoystick} />

			<button
				onClick={handleRepeatVoice}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full bg-black/50 border border-white/30 text-white font-bold text-sm backdrop-blur-md active:scale-95 transition-transform"
			>
				🔊 Повторити
			</button>

			<button
				onClick={handleJump}
				className="absolute bottom-8 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-600 border-2 border-white/30 text-white text-2xl font-black shadow-lg active:scale-90 transition-transform z-20"
			>
				⬆️
			</button>

			{victory && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className="text-center space-y-4 p-8 rounded-3xl bg-gradient-to-br from-violet-600/90 to-pink-600/90 border-2 border-white/30 max-w-sm mx-4">
						<div className="text-5xl">🎉📚🎉</div>
						<h2 className="text-3xl font-black text-white">Молодець, Діано!</h2>
						<p className="text-white/90 text-lg">
							Ти знаєш всю абетку! {ALPHABET.length} букв!
						</p>
						<div className="text-2xl font-black text-yellow-300 tracking-widest">
							{ALPHABET.map((a) => a.char).join(" ")}
						</div>
						<button
							onClick={handleRestart}
							className="px-8 py-4 rounded-2xl bg-white text-violet-700 text-xl font-black shadow-lg active:scale-95 transition-transform"
						>
							🔄 Ще раз!
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

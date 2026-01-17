"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TicTacToePage() {
	const [playerId, setPlayerId] = useState(null);
	const [roomId, setRoomId] = useState("");
	const [gameState, setGameState] = useState(null); // board, turn, winner
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	// 1. При старті генеруємо унікальний ID для цього браузера
	useEffect(() => {
		let id = localStorage.getItem("ttt_player_id");
		if (!id) {
			id = Math.random().toString(36).substring(2);
			localStorage.setItem("ttt_player_id", id);
		}
		setPlayerId(id);
	}, []);

	// 2. Опитування сервера (Polling) кожні 2 секунди
	useEffect(() => {
		if (!roomId || !gameState?.winner === false) return; // Якщо є переможець, не опитуємо так часто

		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/game/tictactoe?roomId=${roomId}`);
				if (res.ok) {
					const data = await res.json();
					// Оновлюємо, якщо щось змінилось
					setGameState(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
				}
			} catch (e) {
				console.error("Polling error", e);
			}
		}, 2000);

		return () => clearInterval(interval);
	}, [roomId, gameState?.winner]);

	// Створення гри
	const createGame = async () => {
		setLoading(true);
		const res = await fetch("/api/game/tictactoe", {
			method: "POST",
			body: JSON.stringify({ action: "create", playerId })
		});
		const data = await res.json();
		setRoomId(data.roomId);
		setGameState(data);
		setLoading(false);
	};

	// Вхід у гру
	const joinGame = async () => {
		if (!roomId) return;
		setLoading(true);
		const res = await fetch("/api/game/tictactoe", {
			method: "POST",
			body: JSON.stringify({ action: "join", roomId: roomId.toUpperCase(), playerId })
		});
		if (res.ok) {
			const data = await res.json();
			setGameState(data);
			setError("");
		} else {
			setError("Кімнату не знайдено");
		}
		setLoading(false);
	};

	// Хід
	const makeMove = async (index) => {
		if (!gameState || gameState.winner || gameState.board[index]) return;

		// Оптимістичне оновлення (щоб не чекати сервера для візуалізації)
		const mySymbol = gameState.xPlayer === playerId ? "X" : "O";
		if (gameState.turn !== mySymbol) return; // Не твій хід

		const newState = { ...gameState };
		newState.board[index] = mySymbol;
		newState.turn = mySymbol === "X" ? "O" : "X";
		setGameState(newState);

		await fetch("/api/game/tictactoe", {
			method: "POST",
			body: JSON.stringify({ action: "move", roomId, playerId, index })
		});
	};

	// --- РЕНДЕР: ЛОБІ ---
	if (!gameState) {
		return (
			<main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
				{/* Фон */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] animate-blob" />
					<div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] animate-blob animation-delay-2000" />
				</div>

				<div className="relative z-10 w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
					<h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Хрестики-Нолики</h1>
					<p className="text-slate-400 mb-8">Онлайн гра для двох</p>

					<button
						onClick={createGame}
						disabled={loading}
						className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform mb-6"
					>
						{loading ? "Створення..." : "🔥 Створити гру"}
					</button>

					<div className="relative flex py-2 items-center mb-6">
						<div className="flex-grow border-t border-slate-700"></div>
						<span className="flex-shrink-0 mx-4 text-slate-500 text-sm">АБО ВВЕДИ КОД</span>
						<div className="flex-grow border-t border-slate-700"></div>
					</div>

					<div className="flex gap-2">
						<input
							type="text"
							placeholder="Код кімнати (напр. X7Y9Z)"
							value={roomId}
							onChange={(e) => setRoomId(e.target.value.toUpperCase())}
							className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 text-center font-mono text-xl uppercase tracking-widest focus:outline-none focus:border-blue-500"
						/>
						<button
							onClick={joinGame}
							className="bg-slate-700 hover:bg-slate-600 px-6 rounded-xl font-bold transition-colors"
						>
							Go
						</button>
					</div>
					{error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

					<Link href="/" className="block mt-8 text-sm text-slate-500 hover:text-white transition-colors">
						← Назад в меню
					</Link>
				</div>
			</main>
		);
	}

	// --- РЕНДЕР: ГРА ---
	const isMyTurn = (gameState.turn === "X" && gameState.xPlayer === playerId) ||
		(gameState.turn === "O" && gameState.oPlayer === playerId);
	const amIX = gameState.xPlayer === playerId;

	return (
		<main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
			{/* Фон */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className={`absolute inset-0 transition-colors duration-1000 ${gameState.turn === 'X' ? 'bg-blue-900/20' : 'bg-red-900/20'}`}></div>
			</div>

			<div className="relative z-10 w-full max-w-md">

				{/* Верхня панель */}
				<div className="flex justify-between items-center mb-6 bg-slate-900/60 backdrop-blur p-4 rounded-2xl border border-white/10">
					<div className={`flex items-center gap-2 ${gameState.turn === 'X' ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`}>
						<span className="text-3xl font-black text-blue-400">X</span>
						<span className="text-xs font-bold uppercase">{amIX ? "(Ти)" : ""}</span>
					</div>

					<div className="px-4 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400 border border-slate-700">
						ROOM: <span className="text-white font-bold select-all">{roomId}</span>
					</div>

					<div className={`flex items-center gap-2 ${gameState.turn === 'O' ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`}>
						<span className="text-xs font-bold uppercase">{!amIX ? "(Ти)" : ""}</span>
						<span className="text-3xl font-black text-red-400">O</span>
					</div>
				</div>

				{/* Статус */}
				<div className="text-center mb-8 h-8">
					{gameState.winner ? (
						<div className="text-2xl font-black animate-bounce">
							{gameState.winner === "DRAW" ? "🤝 НІЧИЯ!" : `🎉 ПЕРЕМІГ ${gameState.winner}!`}
						</div>
					) : (
						<div className={`text-xl font-bold ${isMyTurn ? "text-green-400" : "text-slate-500"}`}>
							{isMyTurn ? "Твій хід!" : "Чекаємо суперника..."}
							{!gameState.oPlayer && <div className="text-sm text-yellow-400 mt-1 animate-pulse">Очікуємо підключення другого гравця...</div>}
						</div>
					)}
				</div>

				{/* Дошка */}
				<div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/50 rounded-3xl shadow-2xl backdrop-blur-sm border border-white/5">
					{gameState.board.map((cell, i) => (
						<button
							key={i}
							onClick={() => makeMove(i)}
							disabled={!!cell || !!gameState.winner}
							className={`
                        h-24 w-full rounded-xl text-5xl font-black flex items-center justify-center transition-all duration-200
                        ${!cell && !gameState.winner && isMyTurn ? "hover:bg-white/10 cursor-pointer" : ""}
                        ${cell === "X" ? "text-blue-400 bg-blue-900/20" : ""}
                        ${cell === "O" ? "text-red-400 bg-red-900/20" : ""}
                        ${!cell ? "bg-slate-900/50" : ""}
                    `}
						>
							{cell && (
								<span>{cell}</span>
							)}
						</button>
					))}
				</div>

				{/* Кнопки після гри */}
				<div className="mt-8 flex gap-4">
					<button
						onClick={() => setGameState(null)}
						className="flex-1 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700 transition-colors"
					>
						Вийти
					</button>
					{gameState.winner && (
						<button
							onClick={createGame}
							className="flex-1 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
						>
							Нова гра
						</button>
					)}
				</div>

			</div>
		</main>
	);
}
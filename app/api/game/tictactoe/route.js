export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";

let redisInstance = null;
function getRedis() {
	if (!process.env.REDIS_URL) return null;
	if (!redisInstance) redisInstance = new Redis(process.env.REDIS_URL);
	return redisInstance;
}

// Перевірка переможця
function checkWinner(board) {
	const lines = [
		[0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонталі
		[0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикалі
		[0, 4, 8], [2, 4, 6]             // Діагоналі
	];
	for (let i = 0; i < lines.length; i++) {
		const [a, b, c] = lines[i];
		if (board[a] && board[a] === board[b] && board[a] === board[c]) {
			return board[a];
		}
	}
	return null;
}

// GET: Отримати стан гри (опитування)
export async function GET(req) {
	const redis = getRedis();
	if (!redis) return NextResponse.json({ error: "No Redis" }, { status: 500 });

	const { searchParams } = new URL(req.url);
	const roomId = searchParams.get("roomId");

	if (!roomId) return NextResponse.json({ error: "No Room ID" }, { status: 400 });

	const gameState = await redis.get(`tictactoe:${roomId}`);
	if (!gameState) return NextResponse.json({ error: "Game not found" }, { status: 404 });

	return NextResponse.json(JSON.parse(gameState));
}

// POST: Створити гру або зробити хід
export async function POST(req) {
	const redis = getRedis();
	const body = await req.json();
	const { action, roomId, playerId, index } = body;

	// 1. СТВОРЕННЯ ГРИ
	if (action === "create") {
		const newRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
		const initialState = {
			board: Array(9).fill(null),
			xPlayer: playerId, // Той, хто створив - грає за X
			oPlayer: null,     // Той, хто приєднається - грає за O
			turn: "X",
			winner: null
		};
		// Гра живе 1 годину (3600 сек)
		await redis.set(`tictactoe:${newRoomId}`, JSON.stringify(initialState), "EX", 3600);
		return NextResponse.json({ roomId: newRoomId, ...initialState });
	}

	// 2. ПРИЄДНАННЯ ДО ГРИ
	if (action === "join") {
		const data = await redis.get(`tictactoe:${roomId}`);
		if (!data) return NextResponse.json({ error: "Кімнату не знайдено" }, { status: 404 });

		const state = JSON.parse(data);

		// Якщо це не автор гри, і місця O ще немає — записуємо гравця
		if (state.xPlayer !== playerId && !state.oPlayer) {
			state.oPlayer = playerId;
			await redis.set(`tictactoe:${roomId}`, JSON.stringify(state), "EX", 3600);
		}

		return NextResponse.json(state);
	}

	// 3. ХІД
	if (action === "move") {
		const data = await redis.get(`tictactoe:${roomId}`);
		if (!data) return NextResponse.json({ error: "Game error" }, { status: 404 });

		const state = JSON.parse(data);

		// Перевірки: чи гра закінчена? чи клітинка пуста? чи черга гравця?
		if (state.winner || state.board[index]) return NextResponse.json(state);

		const isX = state.xPlayer === playerId;
		const isO = state.oPlayer === playerId;

		if ((state.turn === "X" && !isX) || (state.turn === "O" && !isO)) {
			return NextResponse.json({ error: "Not your turn" }, { status: 400 });
		}

		// Робимо хід
		state.board[index] = state.turn;

		// Перевірка перемоги
		const win = checkWinner(state.board);
		if (win) {
			state.winner = win;
		} else if (!state.board.includes(null)) {
			state.winner = "DRAW"; // Нічия
		} else {
			// Передача ходу
			state.turn = state.turn === "X" ? "O" : "X";
		}

		await redis.set(`tictactoe:${roomId}`, JSON.stringify(state), "EX", 3600);
		return NextResponse.json(state);
	}

	return NextResponse.json({ error: "Invalid action" });
}
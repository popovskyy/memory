export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";

let redisInstance = null;
let redisAvailable = true;
const memoryStore = new Map();

function getRedis() {
	if (!process.env.REDIS_URL || !redisAvailable) return null;
	if (!redisInstance) {
		redisInstance = new Redis(process.env.REDIS_URL, {
			maxRetriesPerRequest: 1,
			connectTimeout: 3000,
			lazyConnect: true,
		});
		redisInstance.on("error", (err) => {
			console.error("[tictactoe] Redis error, using memory:", err.message);
			redisAvailable = false;
		});
	}
	return redisInstance;
}

async function getGameState(roomId) {
	const redis = getRedis();
	if (redis) {
		try {
			if (redis.status !== "ready") await redis.connect();
			const data = await redis.get(`tictactoe:${roomId}`);
			return data ? JSON.parse(data) : null;
		} catch {
			redisAvailable = false;
		}
	}
	return memoryStore.get(roomId) || null;
}

async function saveGameState(roomId, state, ttlSec = 3600) {
	const redis = getRedis();
	if (redis) {
		try {
			if (redis.status !== "ready") await redis.connect();
			await redis.set(`tictactoe:${roomId}`, JSON.stringify(state), "EX", ttlSec);
			return;
		} catch {
			redisAvailable = false;
		}
	}
	memoryStore.set(roomId, state);
	setTimeout(() => memoryStore.delete(roomId), ttlSec * 1000);
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
	const { searchParams } = new URL(req.url);
	const roomId = searchParams.get("roomId");

	if (!roomId) return NextResponse.json({ error: "No Room ID" }, { status: 400 });

	const gameState = await getGameState(roomId);
	if (!gameState) return NextResponse.json({ error: "Game not found" }, { status: 404 });

	return NextResponse.json(gameState);
}

// POST: Створити гру або зробити хід
export async function POST(req) {
	const body = await req.json();
	const { action, roomId, playerId, index } = body;

	// 1. СТВОРЕННЯ ГРИ
	if (action === "create") {
		const newRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
		const initialState = {
			board: Array(9).fill(null),
			xPlayer: playerId,
			oPlayer: null,
			turn: "X",
			winner: null
		};
		await saveGameState(newRoomId, initialState);
		return NextResponse.json({ roomId: newRoomId, ...initialState });
	}

	// 2. ПРИЄДНАННЯ ДО ГРИ
	if (action === "join") {
		const state = await getGameState(roomId);
		if (!state) return NextResponse.json({ error: "Кімнату не знайдено" }, { status: 404 });

		if (state.xPlayer !== playerId && !state.oPlayer) {
			state.oPlayer = playerId;
			await saveGameState(roomId, state);
		}

		return NextResponse.json(state);
	}

	// 3. ХІД
	if (action === "move") {
		const state = await getGameState(roomId);
		if (!state) return NextResponse.json({ error: "Game error" }, { status: 404 });

		if (state.winner || state.board[index]) return NextResponse.json(state);

		const isX = state.xPlayer === playerId;
		const isO = state.oPlayer === playerId;

		if ((state.turn === "X" && !isX) || (state.turn === "O" && !isO)) {
			return NextResponse.json({ error: "Not your turn" }, { status: 400 });
		}

		state.board[index] = state.turn;

		const win = checkWinner(state.board);
		if (win) {
			state.winner = win;
		} else if (!state.board.includes(null)) {
			state.winner = "DRAW";
		} else {
			state.turn = state.turn === "X" ? "O" : "X";
		}

		await saveGameState(roomId, state);
		return NextResponse.json(state);
	}

	return NextResponse.json({ error: "Invalid action" });
}
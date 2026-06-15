export const MAP_HALF = 14;

export const ANIMALS = [
	{ id: "cat", name: "Котик", emoji: "🐱", color: "#f97316" },
	{ id: "dog", name: "Щеня", emoji: "🐶", color: "#8b5cf6" },
	{ id: "rabbit", name: "Кролик", emoji: "🐰", color: "#f472b6" },
	{ id: "fox", name: "Лисичка", emoji: "🦊", color: "#fb923c" },
	{ id: "panda", name: "Панда", emoji: "🐼", color: "#374151" },
];

const COLLECTIBLE_COLORS = ["#fbbf24", "#f472b6", "#60a5fa", "#a78bfa", "#34d399"];

function randomPos() {
	const angle = Math.random() * Math.PI * 2;
	const radius = 3 + Math.random() * (MAP_HALF - 4);
	return {
		x: Math.cos(angle) * radius,
		z: Math.sin(angle) * radius,
	};
}

export function generateCollectibles(count = 30) {
	return Array.from({ length: count }, (_, i) => ({
		id: `star-${i}`,
		position: randomPos(),
		color: COLLECTIBLE_COLORS[i % COLLECTIBLE_COLORS.length],
		collected: false,
	}));
}

export function generatePetSpawns() {
	const positions = [
		{ x: -8, z: -6 },
		{ x: 9, z: -5 },
		{ x: -7, z: 8 },
		{ x: 8, z: 7 },
		{ x: 0, z: -10 },
	];
	return ANIMALS.map((animal, i) => ({
		id: animal.id,
		animalId: animal.id,
		position: positions[i],
		befriended: false,
		followOffset: { x: (i % 2 ? 1 : -1) * (1 + i * 0.3), z: -1.5 - i * 0.2 },
	}));
}

export function getAnimalById(id) {
	return ANIMALS.find((a) => a.id === id);
}

export function clampToMap(x, z) {
	const dist = Math.sqrt(x * x + z * z);
	const max = MAP_HALF - 1;
	if (dist > max) {
		const s = max / dist;
		return { x: x * s, z: z * s };
	}
	return { x, z };
}

export function dist2d(ax, az, bx, bz) {
	return Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2);
}

export const ALPHABET = [
	{ char: "А", word: "Авто", emoji: "🚗", color: "#ef4444" },
	{ char: "Б", word: "Банан", emoji: "🍌", color: "#f97316" },
	{ char: "В", word: "Ведмідь", emoji: "🐻", color: "#8b5cf6" },
	{ char: "Г", word: "Груша", emoji: "🍐", color: "#22c55e" },
	{ char: "Ґ", word: "Ґудзик", emoji: "🔘", color: "#6366f1" },
	{ char: "Д", word: "Динозавр", emoji: "🦖", color: "#14b8a6" },
	{ char: "Е", word: "Ельф", emoji: "🧚", color: "#ec4899" },
	{ char: "Є", word: "Єдиноріг", emoji: "🦄", color: "#a855f7" },
	{ char: "Ж", word: "Жираф", emoji: "🦒", color: "#f59e0b" },
	{ char: "З", word: "Зірочка", emoji: "⭐", color: "#fbbf24" },
	{ char: "И", word: "Игуана", emoji: "🦎", color: "#10b981" },
	{ char: "І", word: "Іграшка", emoji: "🧸", color: "#f472b6" },
	{ char: "Ї", word: "Їжак", emoji: "🦔", color: "#78716c" },
	{ char: "Й", word: "Йогурт", emoji: "🥛", color: "#38bdf8" },
	{ char: "К", word: "Котик", emoji: "🐱", color: "#fb923c" },
	{ char: "Л", word: "Лисичка", emoji: "🦊", color: "#fb923c" },
	{ char: "М", word: "М'яч", emoji: "⚽", color: "#22c55e" },
	{ char: "Н", word: "Носоріг", emoji: "🦏", color: "#94a3b8" },
	{ char: "О", word: "Острів", emoji: "🏝️", color: "#2dd4bf" },
	{ char: "П", word: "Панда", emoji: "🐼", color: "#1f2937" },
	{ char: "Р", word: "Рибка", emoji: "🐟", color: "#3b82f6" },
	{ char: "С", word: "Собака", emoji: "🐶", color: "#d97706" },
	{ char: "Т", word: "Тигр", emoji: "🐯", color: "#ea580c" },
	{ char: "У", word: "Улитка", emoji: "🐌", color: "#84cc16" },
	{ char: "Ф", word: "Футбол", emoji: "⚽", color: "#0ea5e9" },
	{ char: "Х", word: "Хмаринка", emoji: "☁️", color: "#cbd5e1" },
	{ char: "Ц", word: "Цукерка", emoji: "🍬", color: "#e879f9" },
	{ char: "Ч", word: "Черепашка", emoji: "🐢", color: "#16a34a" },
	{ char: "Ш", word: "Шар", emoji: "🎈", color: "#f43f5e" },
	{ char: "Щ", word: "Щеня", emoji: "🐶", color: "#8b5cf6" },
	{ char: "Ь", word: "М'який знак", emoji: "✨", color: "#a78bfa" },
	{ char: "Ю", word: "Юла", emoji: "🪀", color: "#06b6d4" },
	{ char: "Я", word: "Яблуко", emoji: "🍎", color: "#dc2626" },
];

const MAP_HALF = 13;

function shuffle(arr) {
	return [...arr].sort(() => Math.random() - 0.5);
}

function spawnPositions(count) {
	const positions = [];
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
		const radius = 4 + Math.random() * 5;
		positions.push({
			x: Math.cos(angle) * radius,
			z: Math.sin(angle) * radius,
		});
	}
	return positions;
}

export function generateLetterRound(target) {
	const others = shuffle(ALPHABET.filter((a) => a.char !== target.char)).slice(0, 5);
	const letters = shuffle([target, ...others]);
	const positions = spawnPositions(letters.length);

	return letters.map((letter, i) => ({
		id: `${letter.char}-${i}-${Date.now()}`,
		char: letter.char,
		emoji: letter.emoji,
		color: letter.color,
		position: [positions[i].x, 0, positions[i].z],
	}));
}

export function pickMissionType(index) {
	return index % 2 === 0 ? "find" : "word";
}

export function getLetterByChar(char) {
	return ALPHABET.find((a) => a.char === char);
}

export function buildPrompt(letter, missionType) {
	if (missionType === "find") {
		return {
			text: `Діано, йди шукай букву ${letter.char}!`,
			sub: "Бігай по острову і тапай на букву!",
		};
	}
	return {
		text: `Діано, ${letter.emoji} ${letter.word} — яка буква?`,
		sub: "Знайди правильну букву на острові!",
	};
}

export function buildSuccessMessage(letter) {
	return `Ура, Діано! Буква ${letter.char} — ${letter.word}!`;
}

export function buildWrongMessage(letter) {
	return `Не та буква, Діано! Шукай букву ${letter.char}!`;
}

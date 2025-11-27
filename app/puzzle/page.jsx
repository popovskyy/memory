import PuzzleGame from "../../components/PuzzleGame";

export default function Page() {
	return (
		<main className="min-h-screen flex items-center justify-center p-6">
			<div className="max-w-3xl w-full">
				<a href="/" className="text-blue-600 underline block mb-4">⬅ Назад</a>
				<h1 className="text-3xl font-bold mb-4 text-center">Puzzle Game</h1>
				<PuzzleGame />
			</div>
		</main>
	);
}

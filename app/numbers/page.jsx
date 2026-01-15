
import NumberTracing from "../../components/NumberTracing";

export default function Page() {
	return (
		<main className="min-h-screen flex items-center justify-center p-6 bg-yellow-100">
			<div className="max-w-3xl w-full">
				<a href="/" className="text-blue-600 underline inline-block mb-10">⬅ Назад</a>
				<h1 className="text-3xl font-bold mb-4 text-center">Цифри</h1>
				<NumberTracing />
			</div>
		</main>
	);
}

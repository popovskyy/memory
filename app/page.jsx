import MemoryGame from "../components/MemoryGame";

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-bold mb-4 text-center">Memory Game</h1>
        <MemoryGame />
      </div>
    </main>
  );
}

"use client";

export default function PuzzlePiece({ image, pos, size }) {
	const tilePercent = 100 / (size - 1);

	const row = Math.floor(pos / size);
	const col = pos % size;

	return (
		<div
			className="w-full h-full bg-cover bg-no-repeat shadow-inner"
			style={{
				backgroundImage: `url(${image})`,
				backgroundSize: `${size * 100}% ${size * 100}%`,
				backgroundPosition: `${col * tilePercent}% ${row * tilePercent}%`,
			}}
		/>
	);
}

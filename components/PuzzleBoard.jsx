"use client";

import PuzzlePiece from "./PuzzlePiece";

export default function PuzzleBoard({ image, size, shuffled, setShuffled }) {
	const tileSize = 100 / size; // % per piece

	const onDragStart = (e, index) => {
		e.dataTransfer.setData("fromIndex", index);
	};

	const onDrop = (e, toIndex) => {
		const fromIndex = Number(e.dataTransfer.getData("fromIndex"));
		if (fromIndex === toIndex) return;

		const newArr = [...shuffled];
		[newArr[fromIndex], newArr[toIndex]] = [newArr[toIndex], newArr[fromIndex]];

		setShuffled(newArr);
	};

	const allowDrop = (e) => e.preventDefault();

	return (
		<div
			className="grid bg-gray-300 rounded overflow-hidden"
			style={{
				gridTemplateColumns: `repeat(${size}, 1fr)`,
				width: "100%",
				aspectRatio: "1 / 1",
			}}
		>
			{shuffled.map((pos, index) => (
				<div
					key={index}
					draggable
					onDragStart={(e) => onDragStart(e, index)}
					onDragOver={allowDrop}
					onDrop={(e) => onDrop(e, index)}
				>
					<PuzzlePiece
						image={image}
						pos={pos}
						size={size}
						tileSize={tileSize}
					/>
				</div>
			))}
		</div>
	);
}

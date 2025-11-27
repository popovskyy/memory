"use client";

import { useState } from "react";
import PuzzlePiece from "./PuzzlePiece";

export default function PuzzleBoard({ image, size, shuffled, setShuffled }) {
	const [activeIndex, setActiveIndex] = useState(null);

	const tileClick = (index) => {
		// якщо нічого не вибрано → вибираємо
		if (activeIndex === null) {
			setActiveIndex(index);
			return;
		}

		// якщо натиснули на той же → скидаємо
		if (activeIndex === index) {
			setActiveIndex(null);
			return;
		}

		// міняємо місцями
		const newArr = [...shuffled];
		[newArr[activeIndex], newArr[index]] = [newArr[index], newArr[activeIndex]];

		setShuffled(newArr);
		setActiveIndex(null);
	};

	return (
		<div
			className="grid rounded overflow-hidden p-10"
			style={{
				gridTemplateColumns: `repeat(${size}, 1fr)`,
				width: "100%",
				aspectRatio: "1 / 1",
			}}
		>
			{shuffled.map((pos, index) => (
				<div
					key={index}
					onClick={() => tileClick(index)}
					className={`
            transition-transform duration-200
            ${activeIndex === index ? "scale-105 ring-4 ring-blue-400 z-10" : ""}
          `}
				>
					<PuzzlePiece image={image} pos={pos} size={size} />
				</div>
			))}
		</div>
	);
}
